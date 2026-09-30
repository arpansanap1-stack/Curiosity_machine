"""Google Gemini API service with rate-limit queue, exponential backoff, and JSON schema parsing."""

import asyncio
import json
import logging
import random
from collections.abc import AsyncGenerator
from typing import Any

from google import genai
from google.genai import types
from google.genai.errors import APIError

from ..core.config import settings
from ..models.schemas import (
    DepthLevel,
    Domain,
    LLMBridgeOutput,
    LLMExpansionOutput,
    LLMRabbitHoleOutput,
    RelationType,
)

logger = logging.getLogger(__name__)


class QuotaExceededException(Exception):
    """Raised when Gemini quota is exhausted or HTTP 429 is encountered repeatedly."""
    pass


class GeminiService:
    def __init__(self):
        self._client: genai.Client | None = None
        self._lock = asyncio.Lock()  # Serialize LLM calls to prevent concurrent bursts against free tier

    def get_client(self) -> genai.Client | None:
        if self._client is not None:
            return self._client
        api_key = settings.gemini_api_key
        if not api_key:
            return None
        try:
            self._client = genai.Client(api_key=api_key)
            return self._client
        except Exception as e:
            logger.warning(f"Could not initialize Gemini Client: {e}")
            return None

    @property
    def is_available(self) -> bool:
        return bool(settings.gemini_api_key) and not settings.force_degraded_mode

    async def _execute_with_retry(self, fn, *args, **kwargs) -> Any:
        """Execute a Gemini call with an async lock, exponential backoff, and jitter for 429 handling."""
        async with self._lock:
            max_retries = 3
            base_delay = 2.0
            for attempt in range(max_retries + 1):
                try:
                    return await asyncio.to_thread(fn, *args, **kwargs)
                except APIError as e:
                    logger.warning(f"Gemini API error (attempt {attempt + 1}/{max_retries + 1}): {e}")
                    # Check for rate limit / quota
                    err_str = str(e).lower()
                    if "429" in err_str or "quota" in err_str or "resource_exhausted" in err_str:
                        if attempt < max_retries:
                            # Exponential backoff with jitter: 2s, 4s, 8s +/- jitter
                            delay = (base_delay * (2 ** attempt)) + random.uniform(0.3, 1.2)
                            logger.info(f"Rate limited by Gemini. Backing off for {delay:.2f}s...")
                            await asyncio.sleep(delay)
                            continue
                        raise QuotaExceededException("Gemini quota rate limit reached.") from e
                    raise
                except Exception as e:
                    logger.error(f"Unexpected error calling Gemini: {e}")
                    raise

    def _clean_json_text(self, text: str) -> str:
        """Strip markdown code fence blocks if returned by model."""
        clean = text.strip()
        if clean.startswith("```json"):
            clean = clean[7:]
        elif clean.startswith("```"):
            clean = clean[3:]
        if clean.endswith("```"):
            clean = clean[:-3]
        return clean.strip()

    async def expand_topic(
        self,
        topic: str,
        recent_trail: list[str] | None = None,
        existing_labels: list[str] | None = None,
    ) -> dict[str, Any]:
        """Call Gemini to expand a topic into root concept + 6-8 connected concepts."""
        client = self.get_client()
        if not client or settings.force_degraded_mode:
            raise QuotaExceededException("Gemini not configured or degraded mode active.")

        system_instruction = (
            "You are the engine of Curiosity Machine, a knowledge-exploration tool. "
            "Given a concept, return related concepts that are accurate, specific, and interesting, "
            "not generic textbook subtopics. Include at least one wildcard from a clearly different field, "
            "with a real and explainable connection. Never invent facts. Prefer concepts that have a Wikipedia article. "
            "Keep labels short (1–4 words). Domains must strictly be one of: science, nature, history, art, tech, "
            "math, philosophy, society, other. Relation types must strictly be one of: causes, part_of, analogous_to, "
            "contrasts_with, inspired, origin_of, applies_to. Return JSON only."
        )

        trail_context = ""
        if recent_trail:
            trail_context = f"\nUser recent trail: {', '.join(recent_trail[-5:])}."
        if existing_labels:
            trail_context += f"\nAvoid duplicating already explored neighbor concepts: {', '.join(existing_labels[-12:])}."

        prompt = (
            f"Explore the topic: '{topic}'.{trail_context}\n"
            "Return the root concept and 6 to 8 unique, high-curiosity neighbors with typed and explained connections."
        )

        def _call():
            config = types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                response_schema=LLMExpansionOutput,
                temperature=0.7,
            )
            response = client.models.generate_content(
                model=settings.gemini_model,
                contents=prompt,
                config=config,
            )
            return response.text

        raw_text = await self._execute_with_retry(_call)
        cleaned = self._clean_json_text(raw_text)
        data = json.loads(cleaned)
        # Validate through Pydantic
        parsed = LLMExpansionOutput.model_validate(data)
        return parsed.model_dump()

    async def explain_node(
        self,
        label: str,
        domain: str,
        depth_level: DepthLevel,
        context_neighbors: list[str] | None = None,
    ) -> dict[str, Any]:
        """Explain a concept at one of the 4 depths, finishing with one 'What to wonder next' question."""
        client = self.get_client()
        if not client or settings.force_degraded_mode:
            # Fallback local explanation
            return {
                "text": f"{label} is a fascinating concept within {domain}. At the {depth_level.value} level, it demonstrates how interconnected our understanding of knowledge is across systems and ideas.",
                "next_question": f"How does {label} interact with broader dynamics in {domain}?",
            }

        word_targets = {
            DepthLevel.SIMPLE: "around 70 to 90 words in simple, intuitive language for a beginner or curious child",
            DepthLevel.STUDENT: "around 130 to 150 words suitable for high school or early college learners",
            DepthLevel.UNDERGRAD: "around 200 to 240 words with technical precision and analytical nuance",
            DepthLevel.EXPERT: "around 300 to 350 words in-depth, discussing frontiers, open problems, and deep mechanisms",
        }

        context_str = ""
        if context_neighbors:
            context_str = f" Contextual neighbors in the exploration graph: {', '.join(context_neighbors[:3])}."

        system_instruction = (
            "You are the master explainer for Curiosity Machine. Write a vivid, engaging, clear explanation. "
            "Do NOT use markdown headings or bullet lists; write smooth, cohesive prose. "
            "At the very end of your response, on a new line starting with 'WONDER: ', provide exactly one provoking "
            "question ('What to wonder next?') that sparks deeper curiosity."
        )

        prompt = (
            f"Concept: '{label}' (Domain: {domain}).{context_str}\n"
            f"Explain at depth level '{depth_level.value}' ({word_targets[depth_level]})."
        )

        def _call():
            config = types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.6,
            )
            response = client.models.generate_content(
                model=settings.gemini_model,
                contents=prompt,
                config=config,
            )
            return response.text

        raw_text = await self._execute_with_retry(_call)
        text = raw_text.strip()
        next_question = f"What unexpected connection might {label} hold?"
        if "WONDER:" in text:
            parts = text.split("WONDER:", 1)
            text = parts[0].strip()
            next_question = parts[1].strip()

        return {
            "text": text,
            "next_question": next_question,
        }

    async def stream_explain_node(
        self,
        label: str,
        domain: str,
        depth_level: DepthLevel,
        context_neighbors: list[str] | None = None,
    ) -> AsyncGenerator[str, None]:
        """Stream explanation tokens for Server-Sent Events."""
        client = self.get_client()
        if not client or settings.force_degraded_mode:
            # Yield precomputed chunks
            fallback = await self.explain_node(label, domain, depth_level, context_neighbors)
            words = fallback["text"].split(" ")
            for w in words:
                yield w + " "
                await asyncio.sleep(0.02)
            yield f"\nWONDER: {fallback['next_question']}"
            return

        word_targets = {
            DepthLevel.SIMPLE: "around 70 to 90 words in simple, intuitive language",
            DepthLevel.STUDENT: "around 130 to 150 words suitable for high school or early college learners",
            DepthLevel.UNDERGRAD: "around 200 to 240 words with technical precision and analytical nuance",
            DepthLevel.EXPERT: "around 300 to 350 words in-depth, discussing frontiers, open problems, and deep mechanisms",
        }

        context_str = ""
        if context_neighbors:
            context_str = f" Contextual neighbors: {', '.join(context_neighbors[:3])}."

        system_instruction = (
            "You are the master explainer for Curiosity Machine. Write a vivid, engaging, clear explanation. "
            "Do NOT use markdown headings or bullet lists; write smooth, cohesive prose. "
            "At the very end of your response, on a new line starting with 'WONDER: ', provide exactly one provoking "
            "question ('What to wonder next?') that sparks deeper curiosity."
        )

        prompt = (
            f"Concept: '{label}' (Domain: {domain}).{context_str}\n"
            f"Explain at depth level '{depth_level.value}' ({word_targets[depth_level]})."
        )

        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.6,
        )

        # Async streaming using client.aio
        async with self._lock:
            try:
                stream = await client.aio.models.generate_content_stream(
                    model=settings.gemini_model,
                    contents=prompt,
                    config=config,
                )
                async for chunk in stream:
                    if chunk.text:
                        yield chunk.text
            except Exception as e:
                logger.error(f"Streaming error from Gemini: {e}")
                fallback = await self.explain_node(label, domain, depth_level, context_neighbors)
                yield fallback["text"]
                yield f"\nWONDER: {fallback['next_question']}"

    async def find_rabbit_holes(
        self,
        node_label: str,
        domain: str,
        summary: str,
    ) -> list[dict[str, Any]]:
        """Generate 3 surprising, distant-yet-genuinely-connected rabbit hole candidates."""
        client = self.get_client()
        if not client or settings.force_degraded_mode:
            # Provide high quality fallback rabbit holes
            return [
                {
                    "label": f"Origins of {node_label}",
                    "domain": Domain.HISTORY.value,
                    "summary_short": f"The hidden historical turning points that gave rise to {node_label}.",
                    "relation_type": RelationType.ORIGIN_OF.value,
                    "why": f"Connects modern understanding of {node_label} to its surprising historical emergence.",
                    "surprise_score": 0.82,
                    "teaser": "How an obscure 19th-century accident shaped what we know today.",
                    "wikipedia_title": node_label,
                },
                {
                    "label": f"Biomimicry & {node_label}",
                    "domain": Domain.NATURE.value,
                    "summary_short": f"How natural evolution independently evolved analogous principles to {node_label}.",
                    "relation_type": RelationType.ANALOGOUS_TO.value,
                    "why": "Nature solved this problem millions of years before humans formalized it.",
                    "surprise_score": 0.88,
                    "teaser": "Deep-sea creatures utilizing this exact structural mechanism.",
                    "wikipedia_title": None,
                },
                {
                    "label": f"Paradox of {node_label}",
                    "domain": Domain.PHILOSOPHY.value,
                    "summary_short": f"A counter-intuitive philosophical dilemma created by {node_label}.",
                    "relation_type": RelationType.CONTRASTS_WITH.value,
                    "why": "Exposes fundamental boundaries in logic and perception.",
                    "surprise_score": 0.94,
                    "teaser": "When pursuing this concept to its limit breaks our basic assumptions.",
                    "wikipedia_title": None,
                },
            ]

        system_instruction = (
            "You are the Rabbit Hole engine of Curiosity Machine. Given a starting concept, find 3 candidates "
            "that maximize relevance × unexpectedness. Each candidate must be distant (often from a different domain) "
            "yet possess a genuine, profound, factual connection. Provide a compelling one-line teaser and a surprise score between 0.70 and 0.99. "
            "Domains: science, nature, history, art, tech, math, philosophy, society, other. "
            "Relation types: causes, part_of, analogous_to, contrasts_with, inspired, origin_of, applies_to. Return JSON only."
        )

        prompt = (
            f"Starting concept: '{node_label}' (Domain: {domain}, Summary: {summary}).\n"
            "Find 3 unexpected, mind-bending rabbit holes."
        )

        def _call():
            config = types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                response_schema=LLMRabbitHoleOutput,
                temperature=0.8,
            )
            response = client.models.generate_content(
                model=settings.gemini_model,
                contents=prompt,
                config=config,
            )
            return response.text

        raw_text = await self._execute_with_retry(_call)
        cleaned = self._clean_json_text(raw_text)
        data = json.loads(cleaned)
        parsed = LLMRabbitHoleOutput.model_validate(data)
        return [c.model_dump() for c in parsed.candidates]

    async def find_bridge(
        self,
        topic_a: str,
        topic_b: str,
    ) -> dict[str, Any]:
        """Find an unexpected yet factual path of 3-5 hops connecting two distant concepts."""
        client = self.get_client()
        if not client or settings.force_degraded_mode:
            # Fallback 3-step bridge
            return {
                "steps": [
                    {
                        "label": f"{topic_a} Fundamentals",
                        "domain": Domain.SCIENCE.value,
                        "summary_short": f"Core dynamics of {topic_a}.",
                        "relation_type": RelationType.PART_OF.value,
                        "why": f"Foundational component of {topic_a}.",
                        "step_story": f"We begin at the structural foundations of {topic_a}.",
                        "wikipedia_title": topic_a,
                    },
                    {
                        "label": "Information & Pattern Dynamics",
                        "domain": Domain.MATH.value,
                        "summary_short": "Mathematical patterns linking disparate physical and cultural systems.",
                        "relation_type": RelationType.ANALOGOUS_TO.value,
                        "why": "Both systems share underlying structural isomorphisms.",
                        "step_story": "Here the mathematical invariants become visible across disciplines.",
                        "wikipedia_title": "Information theory",
                    },
                    {
                        "label": f"{topic_b} Expression",
                        "domain": Domain.TECH.value,
                        "summary_short": f"Manifestation within the domain of {topic_b}.",
                        "relation_type": RelationType.APPLIES_TO.value,
                        "why": f"Applies the shared pattern directly to {topic_b}.",
                        "step_story": f"Arriving at {topic_b} through the unexpected bridge of pattern dynamics.",
                        "wikipedia_title": topic_b,
                    },
                ],
                "overall_story": f"A journey linking '{topic_a}' to '{topic_b}' across foundational patterns and shared principles.",
            }

        system_instruction = (
            "You are the Bridge Finder of Curiosity Machine. Given two seemingly unrelated topics, find a surprising yet "
            "factually grounded bridge consisting of 3 to 5 intermediate hops. Reject hops without a genuine connection. "
            "Each hop should include a domain, relation type, why, and a step story explaining the transition. "
            "Include an overall narrative synthesizing the journey. Return JSON only."
        )

        prompt = f"Find a bridge connecting Topic A: '{topic_a}' to Topic B: '{topic_b}'."

        def _call():
            config = types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                response_schema=LLMBridgeOutput,
                temperature=0.7,
            )
            response = client.models.generate_content(
                model=settings.gemini_model,
                contents=prompt,
                config=config,
            )
            return response.text

        raw_text = await self._execute_with_retry(_call)
        cleaned = self._clean_json_text(raw_text)
        data = json.loads(cleaned)
        parsed = LLMBridgeOutput.model_validate(data)
        return parsed.model_dump()


gemini_service = GeminiService()
