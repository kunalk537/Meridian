"""SnapMagic (formerly SnapEDA) connector — CAD symbols, footprints, 3D models.

Capabilities: search, CAD models, datasheet.
Enable with SNAPMAGIC_TOKEN (snapeda.com/api).
"""

import httpx

from .. import config
from ..models import CadAsset, Capability, ComponentResult, Offer, SearchQuery
from .base import Provider, ProviderError

_API = "https://www.snapeda.com/api/v1"


class SnapMagicProvider(Provider):
    name = "snapmagic"
    display_name = "SnapMagic (SnapEDA)"
    capabilities = frozenset({Capability.SEARCH, Capability.CAD_MODELS, Capability.DATASHEET})

    def is_configured(self) -> bool:
        return bool(config.snapmagic_token())

    def missing_config(self) -> str | None:
        if self.is_configured():
            return None
        return "Set SNAPMAGIC_TOKEN (snapeda.com/api)"

    async def _search_raw(self, keyword: str, limit: int) -> list[dict]:
        params: dict = {"q": keyword, "limit": limit, "token": config.snapmagic_token()}
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
            resp = await client.get(f"{_API}/parts/search", params=params)
            if resp.status_code != 200:
                raise ProviderError(f"snapmagic: search failed ({resp.status_code})")
            data = resp.json()
            if data.get("error"):
                raise ProviderError(f"snapmagic: {data['error']}")
            return data.get("results") or []

    def _map_part(self, p: dict) -> ComponentResult:
        mpn = p.get("part_number") or ""
        manufacturer = (p.get("manufacturer") or {})
        if isinstance(manufacturer, dict):
            manufacturer = manufacturer.get("name")
        page = p.get("url") or f"https://www.snapeda.com/parts/{mpn}/"
        if page.startswith("/"):
            page = f"https://www.snapeda.com{page}"
        offer = Offer(provider=self.name, part_id=mpn, product_url=page)
        return ComponentResult(
            mpn=mpn,
            manufacturer=manufacturer,
            description=p.get("short_description") or p.get("description"),
            package=p.get("package") or None,
            datasheet_url=(p.get("datasheet") or {}).get("url")
            if isinstance(p.get("datasheet"), dict)
            else p.get("datasheet"),
            offers=[offer],
        )

    async def search(self, query: SearchQuery) -> list[ComponentResult]:
        parts = await self._search_raw(query.keyword, query.max_results)
        results = []
        for p in parts:
            r = self._map_part(p)
            if query.manufacturer and (
                not r.manufacturer or query.manufacturer.lower() not in r.manufacturer.lower()
            ):
                continue
            results.append(r)
        return results[: query.max_results]

    async def fetch_models(self, part_id: str) -> list[CadAsset]:
        parts = await self._search_raw(part_id, 5)
        for p in parts:
            if (p.get("part_number") or "").lower() != part_id.lower():
                continue
            page = p.get("url") or f"https://www.snapeda.com/parts/{part_id}/"
            if page.startswith("/"):
                page = f"https://www.snapeda.com{page}"
            assets = []
            if p.get("has_symbol"):
                assets.append(
                    CadAsset(kind="symbol", format="universal", filename=f"{part_id}-symbol", url=page)
                )
            if p.get("has_footprint"):
                assets.append(
                    CadAsset(kind="footprint", format="universal", filename=f"{part_id}-footprint", url=page)
                )
            if p.get("has_3d_model"):
                assets.append(
                    CadAsset(kind="step", format="universal", filename=f"{part_id}.step", url=page)
                )
            return assets
        raise ProviderError(f"snapmagic: part {part_id!r} not found")

    async def fetch_datasheet(self, part_id: str) -> str | None:
        parts = await self._search_raw(part_id, 5)
        for p in parts:
            if (p.get("part_number") or "").lower() == part_id.lower():
                return self._map_part(p).datasheet_url
        return None
