"""Mouser connector — Search API v1 (API key).

Capabilities: search, details, pricing, availability, datasheet.
Enable with MOUSER_API_KEY (mouser.com/api-hub).
"""

import re

import httpx

from .. import config
from ..models import (
    CadAsset,
    Capability,
    ComponentDetails,
    ComponentResult,
    Offer,
    PriceBreak,
    SearchQuery,
)
from .base import Provider, ProviderError

_API = "https://api.mouser.com/api/v1"


def _parse_price(text: str | None) -> float | None:
    if not text:
        return None
    cleaned = re.sub(r"[^\d.,]", "", text).replace(",", ".")
    try:
        return float(cleaned)
    except ValueError:
        return None


class MouserProvider(Provider):
    name = "mouser"
    display_name = "Mouser Electronics"
    capabilities = frozenset(
        {
            Capability.SEARCH,
            Capability.DETAILS,
            Capability.PRICING,
            Capability.AVAILABILITY,
            Capability.DATASHEET,
        }
    )

    def is_configured(self) -> bool:
        return bool(config.mouser_api_key())

    def missing_config(self) -> str | None:
        if self.is_configured():
            return None
        return "Set MOUSER_API_KEY (mouser.com/api-hub)"

    def _map_part(self, p: dict) -> ComponentResult:
        breaks = []
        for b in p.get("PriceBreaks") or []:
            price = _parse_price(b.get("Price"))
            if price is not None:
                breaks.append(
                    PriceBreak(
                        quantity=b.get("Quantity", 1),
                        unit_price=price,
                        currency=b.get("Currency", "USD"),
                    )
                )
        stock_match = re.search(r"\d+", p.get("Availability") or "")
        offer = Offer(
            provider=self.name,
            part_id=p.get("MouserPartNumber") or p.get("ManufacturerPartNumber", ""),
            product_url=p.get("ProductDetailUrl"),
            stock=int(stock_match.group()) if stock_match else None,
            price_breaks=breaks,
        )
        return ComponentResult(
            mpn=p.get("ManufacturerPartNumber", ""),
            manufacturer=p.get("Manufacturer"),
            description=p.get("Description"),
            category=p.get("Category"),
            datasheet_url=p.get("DataSheetUrl") or None,
            image_url=p.get("ImagePath") or None,
            offers=[offer],
        )

    async def _keyword_search(self, keyword: str, records: int) -> list[dict]:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(
                f"{_API}/search/keyword",
                params={"apiKey": config.mouser_api_key()},
                json={
                    "SearchByKeywordRequest": {
                        "keyword": keyword,
                        "records": records,
                        "startingRecord": 0,
                    }
                },
            )
            if resp.status_code != 200:
                raise ProviderError(f"mouser: search failed ({resp.status_code}): {resp.text[:200]}")
            data = resp.json()
            errors = data.get("Errors") or []
            if errors:
                raise ProviderError(f"mouser: {errors[0].get('Message', 'API error')}")
            return (data.get("SearchResults") or {}).get("Parts") or []

    async def search(self, query: SearchQuery) -> list[ComponentResult]:
        parts = await self._keyword_search(query.keyword, query.max_results)
        results = [self._map_part(p) for p in parts]
        if query.manufacturer:
            results = [
                r for r in results
                if r.manufacturer and query.manufacturer.lower() in r.manufacturer.lower()
            ]
        if query.in_stock_only:
            results = [r for r in results if any((o.stock or 0) > 0 for o in r.offers)]
        return results

    async def fetch_details(self, part_id: str) -> ComponentDetails:
        parts = await self._keyword_search(part_id, 1)
        if not parts:
            raise ProviderError(f"mouser: part {part_id!r} not found")
        p = parts[0]
        base = self._map_part(p)
        specs = {
            (attr.get("AttributeName") or ""): (attr.get("AttributeValue") or "")
            for attr in p.get("ProductAttributes") or []
        }
        return ComponentDetails(
            **base.model_dump(),
            specifications=specs,
            lifecycle_status=p.get("LifecycleStatus") or None,
            cad_assets=[],
        )

    async def fetch_pricing(self, part_id: str) -> Offer:
        details = await self.fetch_details(part_id)
        if not details.offers:
            raise ProviderError("mouser: no pricing returned")
        return details.offers[0]

    async def fetch_datasheet(self, part_id: str) -> str | None:
        return (await self.fetch_details(part_id)).datasheet_url

    async def fetch_models(self, part_id: str) -> list[CadAsset]:
        raise ProviderError("mouser: CAD models not offered; use snapmagic")
