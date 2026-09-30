"""Wikipedia API integration for grounding (verification) and degraded fallback expansion."""

import urllib.parse
from typing import Any

import httpx

from ..models.schemas import Domain, RelationType

WIKI_REST_SUMMARY_URL = "https://en.wikipedia.org/api/rest_v1/page/summary/{title}"
WIKI_ACTION_API_URL = "https://en.wikipedia.org/w/api.php"
USER_AGENT = "CuriosityMachine/1.0 (https://github.com/curiositymachine; curiosity@machine.local)"


async def verify_concept_with_wikipedia(query: str) -> dict[str, Any] | None:
    """Verify concept against Wikipedia and extract verified metadata.
    Returns dict with wiki_title, wiki_url, wiki_extract if verified, else None.
    """
    clean_query = query.strip()
    if not clean_query:
        return None

    encoded_title = urllib.parse.quote(clean_query.replace(" ", "_"))
    headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}

    async with httpx.AsyncClient(timeout=4.0, headers=headers) as client:
        # 1. Try direct REST summary
        try:
            resp = await client.get(WIKI_REST_SUMMARY_URL.format(title=encoded_title))
            if resp.status_code == 200:
                data = resp.json()
                if data.get("type") != "disambiguation":
                    return {
                        "verified": True,
                        "wiki_title": data.get("title", clean_query),
                        "wiki_url": data.get("content_urls", {}).get("desktop", {}).get("page", f"https://en.wikipedia.org/wiki/{encoded_title}"),
                        "wiki_extract": data.get("extract", "")[:300] if data.get("extract") else None,
                    }
        except Exception:
            pass

        # 2. Try OpenSearch fallback for search query
        try:
            params: dict[str, str | int] = {
                "action": "opensearch",
                "search": clean_query,
                "limit": 1,
                "namespace": 0,
                "format": "json",
            }
            resp = await client.get(WIKI_ACTION_API_URL, params=params)
            if resp.status_code == 200:
                result = resp.json()
                # format: [search_term, [titles], [descriptions], [urls]]
                if len(result) >= 4 and result[1] and result[3]:
                    matched_title = result[1][0]
                    matched_url = result[3][0]
                    matched_desc = result[2][0] if result[2] else None

                    # If OpenSearch found a title, try summary for better extract
                    try:
                        sum_resp = await client.get(
                            WIKI_REST_SUMMARY_URL.format(title=urllib.parse.quote(matched_title.replace(" ", "_")))
                        )
                        if sum_resp.status_code == 200:
                            sum_data = sum_resp.json()
                            return {
                                "verified": True,
                                "wiki_title": sum_data.get("title", matched_title),
                                "wiki_url": sum_data.get("content_urls", {}).get("desktop", {}).get("page", matched_url),
                                "wiki_extract": sum_data.get("extract", matched_desc)[:300] if sum_data.get("extract") else matched_desc,
                            }
                    except Exception:
                        pass

                    return {
                        "verified": True,
                        "wiki_title": matched_title,
                        "wiki_url": matched_url,
                        "wiki_extract": matched_desc[:300] if matched_desc else None,
                    }
        except Exception:
            pass

    return None


def infer_domain_from_text(text: str) -> Domain:
    """Heuristic domain classifier from text description or categories."""
    t = text.lower()
    if any(k in t for k in ["physics", "quantum", "chemistry", "biology", "astronomy", "cell", "energy", "planet", "galaxy", "organism", "gene", "molecule", "neuroscience"]):
        return Domain.SCIENCE
    if any(k in t for k in ["animal", "plant", "forest", "ocean", "species", "ecosystem", "nature", "weather", "geology", "climate", "wildlife"]):
        return Domain.NATURE
    if any(k in t for k in ["war", "century", "empire", "revolution", "historical", "ancient", "dynasty", "treaty", "president", "king", "civilization"]):
        return Domain.HISTORY
    if any(k in t for k in ["art", "painting", "music", "literature", "sculpture", "film", "poetry", "dance", "composer", "aesthetic", "architecture"]):
        return Domain.ART
    if any(k in t for k in ["computer", "software", "algorithm", "digital", "internet", "robot", "hardware", "engineering", "network", "code", "ai"]):
        return Domain.TECH
    if any(k in t for k in ["mathematics", "theorem", "algebra", "geometry", "calculus", "number", "equation", "topology", "logic", "proof"]):
        return Domain.MATH
    if any(k in t for k in ["philosophy", "ethics", "epistemology", "morality", "existential", "metaphysics", "reasoning", "philosopher"]):
        return Domain.PHILOSOPHY
    if any(k in t for k in ["society", "politics", "economics", "culture", "community", "social", "law", "government", "sociology", "urban"]):
        return Domain.SOCIETY
    return Domain.OTHER


async def expand_from_wikipedia_degraded(topic: str) -> dict[str, Any]:
    """Degraded mode fallback: generate root concept and 6-8 related concepts using Wikipedia.
    Keeps the entire application fully usable even if Gemini API quota is 0 or unconfigured.
    """
    clean_topic = topic.strip()
    root_verification = await verify_concept_with_wikipedia(clean_topic)
    root_title = root_verification["wiki_title"] if root_verification else clean_topic.title()
    root_extract = (
        root_verification["wiki_extract"]
        if root_verification and root_verification.get("wiki_extract")
        else f"Exploration of {clean_topic}."
    )
    root_domain = infer_domain_from_text(f"{root_title} {root_extract}")

    headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}
    neighbors: list[dict[str, Any]] = []

    # Fetch Wikipedia links / related search results
    async with httpx.AsyncClient(timeout=5.0, headers=headers) as client:
        # First try search for related terms
        params: dict[str, str | int] = {
            "action": "query",
            "list": "search",
            "srsearch": f'"{clean_topic}"',
            "srlimit": 10,
            "format": "json",
        }
        try:
            resp = await client.get(WIKI_ACTION_API_URL, params=params)
            if resp.status_code == 200:
                search_results = resp.json().get("query", {}).get("search", [])
                for item in search_results:
                    title = item.get("title", "")
                    if title.lower() == root_title.lower() or len(title) > 40:
                        continue
                    # Clean html snippet
                    snippet = item.get("snippet", "").replace("<span class=\"searchmatch\">", "").replace("</span>", "")
                    domain = infer_domain_from_text(f"{title} {snippet}")
                    neighbors.append({
                        "label": title,
                        "domain": domain.value,
                        "summary_short": snippet[:140] if snippet else f"Related concept to {root_title}.",
                        "relation_type": RelationType.APPLIES_TO.value if len(neighbors) % 2 == 0 else RelationType.PART_OF.value,
                        "why": f"Directly connected to {root_title} in documented encyclopedic research.",
                        "surprise_score": 0.45 + (len(neighbors) * 0.05),
                        "is_wildcard": len(neighbors) == 3,
                        "wikipedia_title": title,
                    })
                    if len(neighbors) >= 7:
                        break
        except Exception:
            pass

    # Fallback to generic curiosity concepts if Wikipedia search returned few items
    if len(neighbors) < 6:
        fallback_seeds = [
            ("Core Principles", Domain.SCIENCE, "Fundamental governing rules and mechanisms", RelationType.PART_OF),
            ("Historical Roots", Domain.HISTORY, "Origins and evolution across human timeline", RelationType.ORIGIN_OF),
            ("Philosophical Implications", Domain.PHILOSOPHY, "Conceptual inquiries into meaning and existence", RelationType.ANALOGOUS_TO),
            ("Modern Applications", Domain.TECH, "Technological integration and practical systems", RelationType.APPLIES_TO),
            ("Natural Counterparts", Domain.NATURE, "Parallels found in organic systems and ecosystems", RelationType.ANALOGOUS_TO),
            ("Creative Interpretations", Domain.ART, "Artistic and expressive representations", RelationType.INSPIRED),
        ]
        for label_seed, dom, desc, rel in fallback_seeds:
            if len(neighbors) >= 7:
                break
            full_label = f"{label_seed} of {clean_topic[:15]}"
            neighbors.append({
                "label": full_label,
                "domain": dom.value,
                "summary_short": desc,
                "relation_type": rel.value,
                "why": f"Foundational dimension of {root_title}.",
                "surprise_score": 0.5,
                "is_wildcard": False,
                "wikipedia_title": None,
            })

    return {
        "root": {
            "label": root_title,
            "domain": root_domain.value,
            "summary_short": root_extract[:140],
            "wikipedia_title": root_title if root_verification else None,
            "wiki_url": root_verification.get("wiki_url") if root_verification else None,
            "wiki_extract": root_verification.get("wiki_extract") if root_verification else None,
            "verified": root_verification is not None,
        },
        "neighbors": neighbors,
    }
