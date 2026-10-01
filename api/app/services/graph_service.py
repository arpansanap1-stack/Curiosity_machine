"""Core graph orchestration service managing nodes, edges, exploration, and user state."""

import asyncio
import re
import uuid

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.entities import (
    EdgeEntity,
    NodeEntity,
    NodeExplanationEntity,
    UserNodeEntity,
    UserTrailEntity,
    utc_now_iso,
)
from ..models.schemas import (
    BridgeHop,
    BridgeResponse,
    CuriosityProfileResponse,
    DepthLevel,
    Domain,
    Edge,
    ExpandResponse,
    ExploreResponse,
    MapSyncResponse,
    Node,
    RabbitHoleCandidate,
    RabbitHoleResponse,
    RabbitHoleTravelResponse,
    RelationType,
    UserMapResponse,
    UserNodeState,
    UserTrailStep,
)
from .cache_service import get_cached_response, make_cache_key, set_cached_response
from .gemini_service import QuotaExceededException, gemini_service
from .wiki_service import expand_from_wikipedia_degraded, verify_concept_with_wikipedia


def slugify(text: str) -> str:
    """Generate safe, clean alphanumeric slug."""
    s = text.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_-]+", "-", s)
    return s[:100] or f"node-{uuid.uuid4().hex[:8]}"


class GraphService:
    async def get_or_create_node(
        self,
        session: AsyncSession,
        label: str,
        domain: Domain,
        summary_short: str,
        wiki_title: str | None = None,
        wiki_url: str | None = None,
        wiki_extract: str | None = None,
        verified: bool = False,
        is_wildcard: bool = False,
    ) -> NodeEntity:
        """Find existing node by slug or create a new one."""
        clean_label = label.strip()
        slug = slugify(clean_label)
        stmt = select(NodeEntity).where(NodeEntity.slug == slug)
        res = await session.execute(stmt)
        existing = res.scalar_one_or_none()
        if existing:
            # Upgrade verification if newly verified
            if verified and not existing.verified:
                existing.verified = True
                existing.wiki_title = wiki_title or existing.wiki_title
                existing.wiki_url = wiki_url or existing.wiki_url
                existing.wiki_extract = wiki_extract or existing.wiki_extract
                await session.commit()
            return existing

        node_id = f"node_{uuid.uuid4().hex[:12]}"
        new_node = NodeEntity(
            id=node_id,
            slug=slug,
            label=clean_label,
            domain=domain.value,
            summary_short=summary_short[:250],
            wiki_title=wiki_title,
            wiki_url=wiki_url,
            wiki_extract=wiki_extract,
            verified=verified,
            is_wildcard=is_wildcard,
            created_at=utc_now_iso(),
        )
        session.add(new_node)
        await session.commit()
        await session.refresh(new_node)
        return new_node

    async def get_or_create_edge(
        self,
        session: AsyncSession,
        source_id: str,
        target_id: str,
        relation_type: RelationType,
        why: str,
        surprise_score: float = 0.0,
    ) -> EdgeEntity:
        """Find existing edge between nodes or create a new directed/reciprocal connection."""
        stmt = select(EdgeEntity).where(
            or_(
                and_(EdgeEntity.source_id == source_id, EdgeEntity.target_id == target_id),
                and_(EdgeEntity.source_id == target_id, EdgeEntity.target_id == source_id),
            )
        )
        res = await session.execute(stmt)
        existing = res.scalar_one_or_none()
        if existing:
            return existing

        edge_id = f"edge_{uuid.uuid4().hex[:12]}"
        new_edge = EdgeEntity(
            id=edge_id,
            source_id=source_id,
            target_id=target_id,
            relation_type=relation_type.value,
            why=why[:300],
            surprise_score=float(min(max(surprise_score, 0.0), 1.0)),
            created_at=utc_now_iso(),
        )
        session.add(new_edge)
        await session.commit()
        await session.refresh(new_edge)
        return new_edge

    async def record_user_exploration(
        self,
        session: AsyncSession,
        device_id: str,
        node_id: str,
        depth_level: DepthLevel = DepthLevel.SIMPLE,
        from_node_id: str | None = None,
        via: str = "explore",
    ) -> None:
        """Record or update user's visit to a node and append to exploration trail."""
        # 1. User node state
        stmt = select(UserNodeEntity).where(
            and_(UserNodeEntity.device_id == device_id, UserNodeEntity.node_id == node_id)
        )
        res = await session.execute(stmt)
        user_node = res.scalar_one_or_none()
        if not user_node:
            user_node = UserNodeEntity(
                device_id=device_id,
                node_id=node_id,
                explored_at=utc_now_iso(),
                depth_level=depth_level.value,
                starred=False,
            )
            session.add(user_node)
        else:
            # Upgrade depth if current is deeper
            order = [DepthLevel.SIMPLE, DepthLevel.STUDENT, DepthLevel.UNDERGRAD, DepthLevel.EXPERT]
            curr_idx = order.index(DepthLevel(user_node.depth_level)) if user_node.depth_level in [d.value for d in order] else 0
            new_idx = order.index(depth_level)
            if new_idx > curr_idx:
                user_node.depth_level = depth_level.value

        # 2. Append trail step
        step_stmt = select(func.count()).select_from(UserTrailEntity).where(UserTrailEntity.device_id == device_id)
        step_res = await session.execute(step_stmt)
        curr_step = (step_res.scalar() or 0) + 1

        trail_step = UserTrailEntity(
            device_id=device_id,
            step=curr_step,
            node_id=node_id,
            from_node_id=from_node_id,
            via=via,
            at=utc_now_iso(),
        )
        session.add(trail_step)
        await session.commit()

    def entity_to_node_schema(self, entity: NodeEntity, depth_explored: DepthLevel = DepthLevel.SIMPLE) -> Node:
        return Node(
            id=entity.id,
            slug=entity.slug,
            label=entity.label,
            domain=Domain(entity.domain) if entity.domain in [d.value for d in Domain] else Domain.OTHER,
            summary_short=entity.summary_short,
            wiki_title=entity.wiki_title,
            wiki_url=entity.wiki_url,
            wiki_extract=entity.wiki_extract,
            verified=bool(entity.verified),
            is_wildcard=bool(entity.is_wildcard),
            depth_explored=depth_explored,
            created_at=entity.created_at,
        )

    def entity_to_edge_schema(self, entity: EdgeEntity) -> Edge:
        return Edge(
            id=entity.id,
            source_id=entity.source_id,
            target_id=entity.target_id,
            relation_type=RelationType(entity.relation_type) if entity.relation_type in [r.value for r in RelationType] else RelationType.PART_OF,
            why=entity.why,
            surprise_score=entity.surprise_score,
            created_at=entity.created_at,
        )

    async def explore(
        self,
        session: AsyncSession,
        topic: str,
        device_id: str,
    ) -> ExploreResponse:
        """Explore a new topic. Generates root star + 6-8 connected concepts."""
        clean_topic = topic.strip()
        cache_key = make_cache_key("explore", {"topic": clean_topic})

        # 1. Check cache
        cached = await get_cached_response(session, cache_key)
        if cached:
            # Rehydrate from DB entities
            root_id = cached.get("root_id")
            neighbor_ids = cached.get("neighbor_ids", [])
            edge_ids = cached.get("edge_ids", [])

            root_ent = await session.get(NodeEntity, root_id) if root_id else None
            if root_ent:
                neighbors: list[Node] = []
                for nid in neighbor_ids:
                    n_ent = await session.get(NodeEntity, nid)
                    if n_ent:
                        neighbors.append(self.entity_to_node_schema(n_ent))
                edges: list[Edge] = []
                for eid in edge_ids:
                    e_ent = await session.get(EdgeEntity, eid)
                    if e_ent:
                        edges.append(self.entity_to_edge_schema(e_ent))

                # Record user exploration
                await self.record_user_exploration(session, device_id, root_ent.id, via="explore")

                return ExploreResponse(
                    root=self.entity_to_node_schema(root_ent),
                    neighbors=neighbors,
                    edges=edges,
                    from_cache=True,
                    degraded=False,
                )

        # 2. Generate via Gemini or Wikipedia fallback
        degraded = False
        try:
            llm_result = await gemini_service.expand_topic(clean_topic)
        except (QuotaExceededException, Exception):
            llm_result = await expand_from_wikipedia_degraded(clean_topic)
            degraded = True

        root_info = llm_result.get("root") or {
            "label": clean_topic.title(),
            "domain": Domain.SCIENCE.value,
            "summary_short": f"Exploration of {clean_topic}.",
        }

        raw_neighbors = llm_result.get("neighbors", [])[:8]

        # Parallelize Wikipedia verification for root and all neighbors concurrently
        wiki_tasks = [verify_concept_with_wikipedia(root_info["label"])] + [
            verify_concept_with_wikipedia(item.get("wikipedia_title") or item.get("label", ""))
            for item in raw_neighbors
        ]
        all_wiki_results = await asyncio.gather(*wiki_tasks, return_exceptions=True)

        root_wiki_res = all_wiki_results[0]
        root_wiki = root_wiki_res if isinstance(root_wiki_res, dict) else None
        root_verified = root_wiki is not None
        root_wiki_title = str(root_wiki["wiki_title"]) if (root_wiki and "wiki_title" in root_wiki) else root_info.get("wikipedia_title")
        root_wiki_url = str(root_wiki["wiki_url"]) if (root_wiki and "wiki_url" in root_wiki) else None
        root_wiki_extract = str(root_wiki["wiki_extract"]) if (root_wiki and "wiki_extract" in root_wiki) else None

        domain_val = root_info.get("domain", Domain.SCIENCE.value)
        domain_enum = Domain(domain_val) if domain_val in [d.value for d in Domain] else Domain.OTHER

        root_entity = await self.get_or_create_node(
            session=session,
            label=root_info["label"],
            domain=domain_enum,
            summary_short=root_info.get("summary_short", f"Exploration of {clean_topic}."),
            wiki_title=root_wiki_title,
            wiki_url=root_wiki_url,
            wiki_extract=root_wiki_extract,
            verified=root_verified,
            is_wildcard=False,
        )

        # 3. Create neighbors and edges
        neighbor_nodes: list[Node] = []
        created_edges: list[Edge] = []
        neighbor_ids_for_cache: list[str] = []
        edge_ids_for_cache: list[str] = []

        neighbor_wiki_results = all_wiki_results[1:]
        for idx, n_item in enumerate(raw_neighbors):
            try:
                n_label = n_item.get("label", "").strip()
                n_domain_val = n_item.get("domain", Domain.OTHER.value)
                n_domain = Domain(n_domain_val) if n_domain_val in [d.value for d in Domain] else Domain.OTHER
                n_rel_val = n_item.get("relation_type", RelationType.PART_OF.value)
                n_rel = RelationType(n_rel_val) if n_rel_val in [r.value for r in RelationType] else RelationType.PART_OF

                w_res = neighbor_wiki_results[idx] if idx < len(neighbor_wiki_results) else None
                wiki_res = w_res if isinstance(w_res, dict) else None
                verified = wiki_res is not None
                wiki_title = str(wiki_res["wiki_title"]) if (wiki_res and "wiki_title" in wiki_res) else n_item.get("wikipedia_title")
                wiki_url = str(wiki_res["wiki_url"]) if (wiki_res and "wiki_url" in wiki_res) else None
                wiki_extract = str(wiki_res["wiki_extract"]) if (wiki_res and "wiki_extract" in wiki_res) else None

                node_ent = await self.get_or_create_node(
                    session=session,
                    label=n_label,
                    domain=n_domain,
                    summary_short=n_item.get("summary_short", f"Concept related to {root_entity.label}.")[:180],
                    wiki_title=wiki_title,
                    wiki_url=wiki_url,
                    wiki_extract=wiki_extract,
                    verified=verified,
                    is_wildcard=bool(n_item.get("is_wildcard", False)),
                )

                edge_ent = await self.get_or_create_edge(
                    session=session,
                    source_id=root_entity.id,
                    target_id=node_ent.id,
                    relation_type=n_rel,
                    why=n_item.get("why", f"Connected to {root_entity.label}.")[:250],
                    surprise_score=float(n_item.get("surprise_score", 0.5)),
                )

                neighbor_nodes.append(self.entity_to_node_schema(node_ent))
                created_edges.append(self.entity_to_edge_schema(edge_ent))
                neighbor_ids_for_cache.append(node_ent.id)
                edge_ids_for_cache.append(edge_ent.id)
            except Exception:
                continue

        # Record user exploration
        await self.record_user_exploration(session, device_id, root_entity.id, via="explore")

        # Save to cache
        cache_data = {
            "root_id": root_entity.id,
            "neighbor_ids": neighbor_ids_for_cache,
            "edge_ids": edge_ids_for_cache,
            "degraded": degraded,
        }
        await set_cached_response(session, cache_key, cache_data)

        return ExploreResponse(
            root=self.entity_to_node_schema(root_entity),
            neighbors=neighbor_nodes,
            edges=created_edges,
            from_cache=False,
            degraded=degraded,
        )

    async def expand_node(
        self,
        session: AsyncSession,
        node_id: str,
        device_id: str,
        recent_trail: list[str] | None = None,
        existing_labels: list[str] | None = None,
    ) -> ExpandResponse:
        """Expand an existing star into its own neighbors."""
        parent_ent = await session.get(NodeEntity, node_id)
        if not parent_ent:
            raise ValueError(f"Node {node_id} not found.")

        cache_key = make_cache_key("expand", {"node_id": node_id})
        cached = await get_cached_response(session, cache_key)
        if cached:
            neighbor_ids = cached.get("neighbor_ids", [])
            edge_ids = cached.get("edge_ids", [])
            neighbors: list[Node] = []
            for nid in neighbor_ids:
                n_ent = await session.get(NodeEntity, nid)
                if n_ent:
                    neighbors.append(self.entity_to_node_schema(n_ent))
            edges: list[Edge] = []
            for eid in edge_ids:
                e_ent = await session.get(EdgeEntity, eid)
                if e_ent:
                    edges.append(self.entity_to_edge_schema(e_ent))

            await self.record_user_exploration(session, device_id, parent_ent.id, from_node_id=node_id, via="expand")

            return ExpandResponse(
                parent=self.entity_to_node_schema(parent_ent),
                neighbors=neighbors,
                edges=edges,
                from_cache=True,
                degraded=False,
            )

        # Generate via Gemini or Wikipedia fallback
        degraded = False
        try:
            llm_result = await gemini_service.expand_topic(
                parent_ent.label,
                recent_trail=recent_trail,
                existing_labels=existing_labels,
            )
        except (QuotaExceededException, Exception):
            llm_result = await expand_from_wikipedia_degraded(parent_ent.label)
            degraded = True

        neighbor_nodes: list[Node] = []
        created_edges: list[Edge] = []
        neighbor_ids_for_cache: list[str] = []
        edge_ids_for_cache: list[str] = []

        raw_candidates = [
            item for item in llm_result.get("neighbors", [])[:8]
            if item.get("label", "").strip() and item.get("label", "").strip().lower() != parent_ent.label.lower()
        ]

        # Parallelize Wikipedia verification
        wiki_tasks = [
            verify_concept_with_wikipedia(item.get("wikipedia_title") or item.get("label", ""))
            for item in raw_candidates
        ]
        wiki_results = await asyncio.gather(*wiki_tasks, return_exceptions=True)

        for idx, item in enumerate(raw_candidates):
            n_label = item.get("label", "").strip()
            n_domain_val = item.get("domain", Domain.OTHER.value)
            n_domain = Domain(n_domain_val) if n_domain_val in [d.value for d in Domain] else Domain.OTHER
            n_rel_val = item.get("relation_type", RelationType.PART_OF.value)
            n_rel = RelationType(n_rel_val) if n_rel_val in [r.value for r in RelationType] else RelationType.PART_OF

            w_res = wiki_results[idx] if idx < len(wiki_results) else None
            wiki_res = w_res if isinstance(w_res, dict) else None
            verified = wiki_res is not None
            wiki_title = str(wiki_res["wiki_title"]) if (wiki_res and "wiki_title" in wiki_res) else item.get("wikipedia_title")
            wiki_url = str(wiki_res["wiki_url"]) if (wiki_res and "wiki_url" in wiki_res) else None
            wiki_extract = str(wiki_res["wiki_extract"]) if (wiki_res and "wiki_extract" in wiki_res) else None

            n_ent = await self.get_or_create_node(
                session=session,
                label=n_label,
                domain=n_domain,
                summary_short=item.get("summary_short", f"Connected to {parent_ent.label}.")[:180],
                wiki_title=wiki_title,
                wiki_url=wiki_url,
                wiki_extract=wiki_extract,
                verified=verified,
                is_wildcard=bool(item.get("is_wildcard", False)),
            )

            e_ent = await self.get_or_create_edge(
                session=session,
                source_id=parent_ent.id,
                target_id=n_ent.id,
                relation_type=n_rel,
                why=item.get("why", f"Connection between {parent_ent.label} and {n_label}.")[:250],
                surprise_score=float(item.get("surprise_score", 0.5)),
            )

            neighbor_nodes.append(self.entity_to_node_schema(n_ent))
            created_edges.append(self.entity_to_edge_schema(e_ent))
            neighbor_ids_for_cache.append(n_ent.id)
            edge_ids_for_cache.append(e_ent.id)

        await self.record_user_exploration(session, device_id, parent_ent.id, from_node_id=node_id, via="expand")

        cache_data = {
            "neighbor_ids": neighbor_ids_for_cache,
            "edge_ids": edge_ids_for_cache,
            "degraded": degraded,
        }
        await set_cached_response(session, cache_key, cache_data)

        return ExpandResponse(
            parent=self.entity_to_node_schema(parent_ent),
            neighbors=neighbor_nodes,
            edges=created_edges,
            from_cache=False,
            degraded=degraded,
        )

    async def get_or_create_explanation(
        self,
        session: AsyncSession,
        node_id: str,
        depth_level: DepthLevel,
    ) -> tuple[str, str | None, bool]:
        """Fetch explanation from cache or generate via Gemini and persist."""
        stmt = select(NodeExplanationEntity).where(
            and_(NodeExplanationEntity.node_id == node_id, NodeExplanationEntity.depth_level == depth_level.value)
        )
        res = await session.execute(stmt)
        existing = res.scalar_one_or_none()
        if existing:
            return existing.text, existing.next_question, True

        node_ent = await session.get(NodeEntity, node_id)
        if not node_ent:
            raise ValueError(f"Node {node_id} not found.")

        # Find contextual neighbors
        n_stmt = select(NodeEntity.label).join(
            EdgeEntity,
            or_(
                and_(EdgeEntity.source_id == node_id, EdgeEntity.target_id == NodeEntity.id),
                and_(EdgeEntity.target_id == node_id, EdgeEntity.source_id == NodeEntity.id),
            ),
        ).limit(3)
        n_res = await session.execute(n_stmt)
        context_neighbors = [row[0] for row in n_res.fetchall()]

        expl_data = await gemini_service.explain_node(
            label=node_ent.label,
            domain=node_ent.domain,
            depth_level=depth_level,
            context_neighbors=context_neighbors,
        )

        new_expl = NodeExplanationEntity(
            node_id=node_id,
            depth_level=depth_level.value,
            text=expl_data["text"],
            next_question=expl_data.get("next_question"),
            created_at=utc_now_iso(),
        )
        session.add(new_expl)
        await session.commit()
        return expl_data["text"], expl_data.get("next_question"), False

    async def get_rabbit_holes(
        self,
        session: AsyncSession,
        node_id: str,
    ) -> RabbitHoleResponse:
        """Find 3 surprising rabbit holes from node."""
        node_ent = await session.get(NodeEntity, node_id)
        if not node_ent:
            raise ValueError(f"Node {node_id} not found.")

        cache_key = make_cache_key("rabbit_hole", {"node_id": node_id})
        cached = await get_cached_response(session, cache_key)
        if cached:
            cached_candidates = [RabbitHoleCandidate.model_validate(c) for c in cached.get("candidates", [])]
            return RabbitHoleResponse(
                source_node=self.entity_to_node_schema(node_ent),
                candidates=cached_candidates,
            )

        raw_candidates = await gemini_service.find_rabbit_holes(
            node_label=node_ent.label,
            domain=node_ent.domain,
            summary=node_ent.summary_short,
        )

        candidates: list[RabbitHoleCandidate] = []
        for i, item in enumerate(raw_candidates):
            domain_val = item.get("domain", Domain.OTHER.value)
            domain_enum = Domain(domain_val) if domain_val in [d.value for d in Domain] else Domain.OTHER
            rel_val = item.get("relation_type", RelationType.ANALOGOUS_TO.value)
            rel_enum = RelationType(rel_val) if rel_val in [r.value for r in RelationType] else RelationType.ANALOGOUS_TO

            candidates.append(
                RabbitHoleCandidate(
                    candidate_id=f"rh_{node_id}_{i}",
                    label=item.get("label", ""),
                    domain=domain_enum,
                    summary_short=item.get("summary_short", "")[:180],
                    relation_type=rel_enum,
                    why=item.get("why", "")[:250],
                    surprise_score=float(item.get("surprise_score", 0.85)),
                    teaser=item.get("teaser", "Discover an unexpected frontier."),
                    wikipedia_title=item.get("wikipedia_title"),
                )
            )

        await set_cached_response(
            session,
            cache_key,
            {"candidates": [c.model_dump() for c in candidates]},
        )

        return RabbitHoleResponse(
            source_node=self.entity_to_node_schema(node_ent),
            candidates=candidates,
        )

    async def travel_rabbit_hole(
        self,
        session: AsyncSession,
        source_node_id: str,
        candidate: RabbitHoleCandidate,
        device_id: str,
    ) -> RabbitHoleTravelResponse:
        """Execute warp travel into a rabbit hole, creating destination star and comet edge."""
        source_ent = await session.get(NodeEntity, source_node_id)
        if not source_ent:
            raise ValueError(f"Source node {source_node_id} not found.")

        wiki_res = await verify_concept_with_wikipedia(candidate.wikipedia_title or candidate.label)
        verified = wiki_res is not None

        dest_ent = await self.get_or_create_node(
            session=session,
            label=candidate.label,
            domain=candidate.domain,
            summary_short=candidate.summary_short,
            wiki_title=wiki_res["wiki_title"] if wiki_res else candidate.wikipedia_title,
            wiki_url=wiki_res["wiki_url"] if wiki_res else None,
            wiki_extract=wiki_res["wiki_extract"] if wiki_res else None,
            verified=verified,
            is_wildcard=True,
        )

        edge_ent = await self.get_or_create_edge(
            session=session,
            source_id=source_ent.id,
            target_id=dest_ent.id,
            relation_type=candidate.relation_type,
            why=candidate.why,
            surprise_score=candidate.surprise_score,
        )

        await self.record_user_exploration(
            session,
            device_id=device_id,
            node_id=dest_ent.id,
            from_node_id=source_ent.id,
            via="rabbit_hole",
        )

        return RabbitHoleTravelResponse(
            destination=self.entity_to_node_schema(dest_ent),
            edge=self.entity_to_edge_schema(edge_ent),
        )

    async def find_bridge(
        self,
        session: AsyncSession,
        topic_a: str,
        topic_b: str,
        device_id: str,
    ) -> BridgeResponse:
        """Find a path connecting two distant topics with intermediate hops."""
        clean_a = topic_a.strip()
        clean_b = topic_b.strip()
        cache_key = make_cache_key("bridge", {"topic_a": clean_a, "topic_b": clean_b})

        cached = await get_cached_response(session, cache_key)
        if cached:
            node_ids = cached.get("node_ids", [])
            edge_ids = cached.get("edge_ids", [])
            stories = cached.get("stories", [])
            overall_story = cached.get("overall_story", "")

            cached_nodes: list[Node] = []
            for nid in node_ids:
                ent = await session.get(NodeEntity, nid)
                if ent:
                    cached_nodes.append(self.entity_to_node_schema(ent))
            cached_edges: list[Edge] = []
            for eid in edge_ids:
                e_ent = await session.get(EdgeEntity, eid)
                if e_ent:
                    cached_edges.append(self.entity_to_edge_schema(e_ent))

            cached_hops: list[BridgeHop] = []
            for i, n in enumerate(cached_nodes):
                edge_to_next = cached_edges[i] if i < len(cached_edges) else None
                story = stories[i] if i < len(stories) else f"Step {i+1} towards destination."
                cached_hops.append(BridgeHop(node=n, edge_to_next=edge_to_next, step_story=story))

            return BridgeResponse(
                nodes=cached_nodes,
                edges=cached_edges,
                hops=cached_hops,
                overall_story=overall_story,
            )

        bridge_data = await gemini_service.find_bridge(clean_a, clean_b)
        steps = bridge_data.get("steps", [])
        overall_story = bridge_data.get("overall_story", f"Bridge connecting '{clean_a}' and '{clean_b}'.")

        nodes: list[Node] = []
        edges: list[Edge] = []
        hops: list[BridgeHop] = []
        node_ids_cache: list[str] = []
        edge_ids_cache: list[str] = []
        stories_cache: list[str] = []

        prev_node_ent: NodeEntity | None = None
        for step in steps:
            s_label = step.get("label", "").strip()
            s_domain_val = step.get("domain", Domain.SCIENCE.value)
            s_domain = Domain(s_domain_val) if s_domain_val in [d.value for d in Domain] else Domain.OTHER
            s_rel_val = step.get("relation_type", RelationType.PART_OF.value)
            s_rel = RelationType(s_rel_val) if s_rel_val in [r.value for r in RelationType] else RelationType.PART_OF

            wiki_res = await verify_concept_with_wikipedia(step.get("wikipedia_title") or s_label)

            curr_node_ent = await self.get_or_create_node(
                session=session,
                label=s_label,
                domain=s_domain,
                summary_short=step.get("summary_short", f"Bridge milestone in {s_domain_val}.")[:180],
                wiki_title=wiki_res["wiki_title"] if wiki_res else step.get("wikipedia_title"),
                wiki_url=wiki_res["wiki_url"] if wiki_res else None,
                wiki_extract=wiki_res["wiki_extract"] if wiki_res else None,
                verified=wiki_res is not None,
                is_wildcard=False,
            )

            edge_to_next_schema: Edge | None = None
            if prev_node_ent:
                edge_ent = await self.get_or_create_edge(
                    session=session,
                    source_id=prev_node_ent.id,
                    target_id=curr_node_ent.id,
                    relation_type=s_rel,
                    why=step.get("why", f"Transitioning to {s_label}.")[:250],
                    surprise_score=0.75,
                )
                edges.append(self.entity_to_edge_schema(edge_ent))
                edge_ids_cache.append(edge_ent.id)
                edge_to_next_schema = self.entity_to_edge_schema(edge_ent)
                # Assign edge_to_next to preceding hop
                if hops:
                    hops[-1].edge_to_next = edge_to_next_schema

            nodes.append(self.entity_to_node_schema(curr_node_ent))
            node_ids_cache.append(curr_node_ent.id)
            story_line = step.get("step_story", f"Reaching {s_label}.")
            stories_cache.append(story_line)

            hops.append(BridgeHop(
                node=self.entity_to_node_schema(curr_node_ent),
                edge_to_next=None,
                step_story=story_line,
            ))

            await self.record_user_exploration(
                session,
                device_id=device_id,
                node_id=curr_node_ent.id,
                from_node_id=prev_node_ent.id if prev_node_ent else None,
                via="bridge",
            )
            prev_node_ent = curr_node_ent

        await set_cached_response(
            session,
            cache_key,
            {
                "node_ids": node_ids_cache,
                "edge_ids": edge_ids_cache,
                "stories": stories_cache,
                "overall_story": overall_story,
            },
        )

        return BridgeResponse(
            nodes=nodes,
            edges=edges,
            hops=hops,
            overall_story=overall_story,
        )

    async def get_user_map(
        self,
        session: AsyncSession,
        device_id: str,
    ) -> UserMapResponse:
        """Fetch all explored nodes, connections, and personal annotations for the device."""
        u_stmt = select(UserNodeEntity).where(UserNodeEntity.device_id == device_id)
        u_res = await session.execute(u_stmt)
        user_node_ents = u_res.scalars().all()

        node_ids = [un.node_id for un in user_node_ents]

        nodes: list[Node] = []
        domain_counts: dict[str, int] = {d.value: 0 for d in Domain}

        user_node_map: dict[str, UserNodeEntity] = {un.node_id: un for un in user_node_ents}

        if node_ids:
            nodes_stmt = select(NodeEntity).where(NodeEntity.id.in_(node_ids))
            nodes_res = await session.execute(nodes_stmt)
            for n_ent in nodes_res.scalars().all():
                u_state = user_node_map.get(n_ent.id)
                depth = DepthLevel(u_state.depth_level) if u_state and u_state.depth_level in [d.value for d in DepthLevel] else DepthLevel.SIMPLE
                nodes.append(self.entity_to_node_schema(n_ent, depth_explored=depth))
                if n_ent.domain in domain_counts:
                    domain_counts[n_ent.domain] += 1
                else:
                    domain_counts[n_ent.domain] = 1

        # Fetch connecting edges between user's explored nodes
        edges: list[Edge] = []
        if node_ids:
            edges_stmt = select(EdgeEntity).where(
                and_(EdgeEntity.source_id.in_(node_ids), EdgeEntity.target_id.in_(node_ids))
            )
            edges_res = await session.execute(edges_stmt)
            for e_ent in edges_res.scalars().all():
                edges.append(self.entity_to_edge_schema(e_ent))

        # Fetch trails
        trails_stmt = select(UserTrailEntity).where(UserTrailEntity.device_id == device_id).order_by(UserTrailEntity.step)
        trails_res = await session.execute(trails_stmt)
        trails: list[UserTrailStep] = [
            UserTrailStep(
                device_id=t.device_id,
                step=t.step,
                node_id=t.node_id,
                from_node_id=t.from_node_id,
                via=t.via,
                at=t.at,
            )
            for t in trails_res.scalars().all()
        ]

        user_nodes_list = [
            UserNodeState(
                device_id=un.device_id,
                node_id=un.node_id,
                explored_at=un.explored_at,
                depth_level=DepthLevel(un.depth_level) if un.depth_level in [d.value for d in DepthLevel] else DepthLevel.SIMPLE,
                starred=bool(un.starred),
                notes=un.notes,
            )
            for un in user_node_ents
        ]

        return UserMapResponse(
            nodes=nodes,
            edges=edges,
            user_nodes=user_nodes_list,
            trails=trails,
            total_explored=len(nodes),
            domain_counts=domain_counts,
        )

    async def sync_user_map(
        self,
        session: AsyncSession,
        device_id: str,
        user_nodes: list[UserNodeState],
        trails: list[UserTrailStep],
    ) -> MapSyncResponse:
        """Sync client-side offline storage state to server."""
        synced_n = 0
        for un in user_nodes:
            stmt = select(UserNodeEntity).where(
                and_(UserNodeEntity.device_id == device_id, UserNodeEntity.node_id == un.node_id)
            )
            res = await session.execute(stmt)
            existing = res.scalar_one_or_none()
            if existing:
                existing.depth_level = un.depth_level.value
                existing.starred = un.starred
                existing.notes = un.notes
            else:
                new_un = UserNodeEntity(
                    device_id=device_id,
                    node_id=un.node_id,
                    explored_at=un.explored_at,
                    depth_level=un.depth_level.value,
                    starred=un.starred,
                    notes=un.notes,
                )
                session.add(new_un)
            synced_n += 1

        synced_t = 0
        for tr in trails:
            trail_stmt = select(UserTrailEntity).where(
                and_(UserTrailEntity.device_id == device_id, UserTrailEntity.step == tr.step)
            )
            res = await session.execute(trail_stmt)
            if not res.scalar_one_or_none():
                new_tr = UserTrailEntity(
                    device_id=device_id,
                    step=tr.step,
                    node_id=tr.node_id,
                    from_node_id=tr.from_node_id,
                    via=tr.via,
                    at=tr.at,
                )
                session.add(new_tr)
                synced_t += 1

        await session.commit()
        return MapSyncResponse(status="ok", synced_nodes=synced_n, synced_trails=synced_t)

    async def get_curiosity_profile(
        self,
        session: AsyncSession,
        device_id: str,
    ) -> CuriosityProfileResponse:
        """Compute Spotify-Wrapped-style personal curiosity profile."""
        map_resp = await self.get_user_map(session, device_id)
        total = map_resp.total_explored
        domain_dist = {k: v for k, v in map_resp.domain_counts.items() if v > 0}

        all_domains = set(d.value for d in Domain)
        explored_domains = set(domain_dist.keys())
        blind_spots = list(all_domains - explored_domains)

        # Count rabbit holes and bridges from trails
        rh_count = sum(1 for t in map_resp.trails if t.via == "rabbit_hole")
        bridge_count = sum(1 for t in map_resp.trails if t.via == "bridge")

        # Top rabbit holes
        rh_node_ids = [t.node_id for t in map_resp.trails if t.via == "rabbit_hole"]
        top_rh_labels: list[str] = []
        for n in map_resp.nodes:
            if n.id in rh_node_ids and n.label not in top_rh_labels:
                top_rh_labels.append(n.label)

        # Determine explorer type
        expert_count = sum(1 for un in map_resp.user_nodes if un.depth_level == DepthLevel.EXPERT)
        undergrad_count = sum(1 for un in map_resp.user_nodes if un.depth_level == DepthLevel.UNDERGRAD)

        if total == 0:
            exp_type = "Cosmic Novice"
            title = "The Blank Sky"
            tagline = "Your telescope is focused, waiting for the first light of inquiry."
        elif rh_count >= 3:
            exp_type = "Rabbit Hole Voyager"
            title = "The Quantum Wanderer"
            tagline = "You follow unpredictable sparks across distant realms of thought."
        elif bridge_count >= 2:
            exp_type = "Constellation Weaver"
            title = "The Master Polymath"
            tagline = "You discover the hidden threads uniting disparate worlds of knowledge."
        elif (expert_count + undergrad_count) >= max(3, int(total * 0.4)):
            exp_type = "Abyssal Diver"
            title = "The Deep Scholar"
            tagline = "You peel back layers until fundamental mechanisms and frontiers are laid bare."
        elif len(explored_domains) >= 5:
            exp_type = "Wide Wanderer"
            title = "The Universal Cartographer"
            tagline = "Your curiosity spans galaxies, mapping links across broad horizons."
        else:
            exp_type = "Curious Stargazer"
            title = "The Celestial Scout"
            tagline = "Illuminating the constellations of ideas one star at a time."

        # Compute streak (consecutive active dates in trails)
        dates = sorted(list(set(t.at[:10] for t in map_resp.trails)))
        streak = len(dates)

        # Deepest depth
        depth_ranks = {
            DepthLevel.SIMPLE: 1,
            DepthLevel.STUDENT: 2,
            DepthLevel.UNDERGRAD: 3,
            DepthLevel.EXPERT: 4,
        }
        deepest = DepthLevel.SIMPLE
        highest_rank = 1
        for un in map_resp.user_nodes:
            rank = depth_ranks.get(un.depth_level, 1)
            if rank > highest_rank:
                highest_rank = rank
                deepest = un.depth_level

        return CuriosityProfileResponse(
            device_id=device_id,
            explorer_type=exp_type,
            title=title,
            tagline=tagline,
            total_explored=total,
            domain_distribution=domain_dist,
            blind_spots=blind_spots[:4],
            top_rabbit_holes=top_rh_labels[:5],
            streak_days=max(streak, 1) if total > 0 else 0,
            deepest_depth=deepest,
            created_at=utc_now_iso(),
        )


graph_service = GraphService()
