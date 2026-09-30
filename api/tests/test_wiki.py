"""Tests for Wikipedia grounding and degraded fallback expansion."""

import pytest

from app.models.schemas import Domain
from app.services.wiki_service import expand_from_wikipedia_degraded, infer_domain_from_text


def test_infer_domain_heuristics():
    assert infer_domain_from_text("Quantum physics and atomic energy") == Domain.SCIENCE
    assert infer_domain_from_text("Deep sea octopus and coral reef ecosystem") == Domain.NATURE
    assert infer_domain_from_text("Roman empire and historical treaties") == Domain.HISTORY
    assert infer_domain_from_text("Renaissance painting, sculpture, and musical symphony") == Domain.ART
    assert infer_domain_from_text("Deep neural networks and computer algorithms") == Domain.TECH
    assert infer_domain_from_text("Calculus equations and topology theorems") == Domain.MATH
    assert infer_domain_from_text("Epistemology and existential philosophy") == Domain.PHILOSOPHY
    assert infer_domain_from_text("Urban sociology and government policy") == Domain.SOCIETY
    assert infer_domain_from_text("Something completely unrelated and unique") == Domain.OTHER


@pytest.mark.asyncio
async def test_expand_from_wikipedia_degraded():
    # Tests that the degraded fallback generator creates valid 6-8 neighbors without Gemini
    result = await expand_from_wikipedia_degraded("Octopus Intelligence")
    assert "root" in result
    assert "neighbors" in result
    assert len(result["neighbors"]) >= 6
    assert result["root"]["label"] != ""
    assert result["root"]["domain"] in [d.value for d in Domain]
    for neighbor in result["neighbors"]:
        assert neighbor["label"] != ""
        assert neighbor["domain"] in [d.value for d in Domain]
        assert neighbor["relation_type"] != ""
        assert 0.0 <= neighbor["surprise_score"] <= 1.0
