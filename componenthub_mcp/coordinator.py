"""Search coordinator: fan searches out to providers, collect, normalize, merge.

No ranking — results are merged by MPN and returned as-is. The connected LLM
decides how to compare or order them. Everything is in-memory per request.
"""

import asyncio
import time
from collections import deque
from typing import Any

from .models import Capability, ComponentResult, SearchQuery
from .providers import ProviderError, all_providers, get_provider

# Tiny search history (spec: store search, timestamp, providers — never components).
_history: deque[dict[str, Any]] = deque(maxlen=50)


def resolve_providers(names: list[str] | None, capability: Capability) -> tuple[list, list[dict]]:
    """Pick providers that can answer this capability; report ones that can't."""
    skipped: list[dict] = []
    if names:
        candidates = [get_provider(n) for n in names]
    else:
        candidates = list(all_providers().values())
    usable = []
    for p in candidates:
        if capability not in p.capabilities:
            if names:  # only report if explicitly requested
                skipped.append({"provider": p.name, "reason": f"does not support {capability.value}"})
            continue
        if not p.is_configured():
            skipped.append({"provider": p.name, "reason": p.missing_config() or "not configured"})
            continue
        usable.append(p)
    return usable, skipped


def _merge(results: list[ComponentResult]) -> list[ComponentResult]:
    """Merge results from different providers that refer to the same MPN."""
    merged: dict[str, ComponentResult] = {}
    for r in results:
        key = r.mpn.strip().upper()
        if not key:
            merged[id(r).__str__()] = r
            continue
        if key in merged:
            existing = merged[key]
            existing.offers.extend(r.offers)
            existing.manufacturer = existing.manufacturer or r.manufacturer
            existing.description = existing.description or r.description
            existing.category = existing.category or r.category
            existing.package = existing.package or r.package
            existing.datasheet_url = existing.datasheet_url or r.datasheet_url
            existing.image_url = existing.image_url or r.image_url
        else:
            merged[key] = r.model_copy(deep=True)
    return list(merged.values())


async def search(query: SearchQuery, provider_names: list[str] | None) -> dict[str, Any]:
    providers, skipped = resolve_providers(provider_names, Capability.SEARCH)
    errors: list[dict] = list(skipped)

    async def run_one(p) -> list[ComponentResult]:
        try:
            return await p.search(query)
        except ProviderError as e:
            errors.append({"provider": p.name, "reason": str(e)})
        except Exception as e:  # network failures etc. — never fatal
            errors.append({"provider": p.name, "reason": f"unexpected error: {e}"})
        return []

    batches = await asyncio.gather(*(run_one(p) for p in providers))
    flat = [r for batch in batches for r in batch]
    merged = _merge(flat)

    _history.appendleft(
        {
            "query": query.keyword,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "providers": [p.name for p in providers],
            "result_count": len(merged),
        }
    )

    return {
        "results": [r.model_dump(exclude_none=True) for r in merged],
        "providers_searched": [p.name for p in providers],
        "providers_skipped": errors,
        "note": "Results are unranked and unfiltered — compare and rank them yourself as needed.",
    }


def history() -> list[dict[str, Any]]:
    return list(_history)
