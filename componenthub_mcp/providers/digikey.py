"""DigiKey connector — Product Information API v4 (OAuth2 client credentials).

Capabilities: search, details, pricing, availability, datasheet.
Enable with DIGIKEY_CLIENT_ID / DIGIKEY_CLIENT_SECRET.
"""

import time

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

_API = "https://api.digikey.com"


class DigiKeyProvider(Provider):
    name = "digikey"
    display_name = "DigiKey"
    capabilities = frozenset(
        {
            Capability.SEARCH,
            Capability.DETAILS,
            Capability.PRICING,
            Capability.AVAILABILITY,
            Capability.DATASHEET,
        }
    )

    def __init__(self) -> None:
        self._token: str | None = None
        self._token_expiry: float = 0.0

    def is_configured(self) -> bool:
        return bool(config.digikey_client_id() and config.digikey_client_secret())

    def missing_config(self) -> str | None:
        if self.is_configured():
            return None
        return "Set DIGIKEY_CLIENT_ID and DIGIKEY_CLIENT_SECRET (developer.digikey.com)"

    async def _get_token(self, client: httpx.AsyncClient) -> str:
        if self._token and time.monotonic() < self._token_expiry - 60:
            return self._token
        resp = await client.post(
            f"{_API}/v1/oauth2/token",
            data={
                "client_id": config.digikey_client_id(),
                "client_secret": config.digikey_client_secret(),
                "grant_type": "client_credentials",
            },
        )
        if resp.status_code != 200:
            raise ProviderError(f"digikey: token request failed ({resp.status_code})")
        data = resp.json()
        self._token = data["access_token"]
        self._token_expiry = time.monotonic() + int(data.get("expires_in", 600))
        return self._token

    async def _headers(self, client: httpx.AsyncClient) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {await self._get_token(client)}",
            "X-DIGIKEY-Client-Id": config.digikey_client_id() or "",
            "X-DIGIKEY-Locale-Site": "US",
            "X-DIGIKEY-Locale-Currency": "USD",
        }

    def _map_product(self, p: dict) -> ComponentResult:
        variations = p.get("ProductVariations") or [{}]
        best = variations[0]
        breaks = [
            PriceBreak(quantity=b.get("BreakQuantity", 1), unit_price=b.get("UnitPrice", 0.0))
            for b in (best.get("StandardPricing") or [])
        ]
        offer = Offer(
            provider=self.name,
            part_id=best.get("DigiKeyProductNumber") or p.get("ManufacturerProductNumber", ""),
            product_url=p.get("ProductUrl"),
            stock=p.get("QuantityAvailable"),
            price_breaks=breaks,
            packaging=(best.get("PackageType") or {}).get("Name"),
        )
        return ComponentResult(
            mpn=p.get("ManufacturerProductNumber", ""),
            manufacturer=(p.get("Manufacturer") or {}).get("Name"),
            description=(p.get("Description") or {}).get("ProductDescription"),
            category=(p.get("Category") or {}).get("Name"),
            datasheet_url=p.get("DatasheetUrl"),
            image_url=p.get("PhotoUrl"),
            offers=[offer],
        )

    async def search(self, query: SearchQuery) -> list[ComponentResult]:
        async with httpx.AsyncClient(timeout=20) as client:
            body: dict = {"Keywords": query.keyword, "Limit": query.max_results, "Offset": 0}
            if query.manufacturer:
                body["FilterOptionsRequest"] = {
                    "ManufacturerFilter": [{"Id": query.manufacturer}]
                }
            resp = await client.post(
                f"{_API}/products/v4/search/keyword",
                json=body,
                headers=await self._headers(client),
            )
            if resp.status_code != 200:
                raise ProviderError(f"digikey: search failed ({resp.status_code}): {resp.text[:200]}")
            results = [self._map_product(p) for p in resp.json().get("Products", [])]
            if query.in_stock_only:
                results = [r for r in results if any((o.stock or 0) > 0 for o in r.offers)]
            return results

    async def fetch_details(self, part_id: str) -> ComponentDetails:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(
                f"{_API}/products/v4/search/{part_id}/productdetails",
                headers=await self._headers(client),
            )
            if resp.status_code != 200:
                raise ProviderError(f"digikey: details failed ({resp.status_code})")
            p = resp.json().get("Product", {})
            base = self._map_product(p)
            specs = {
                (param.get("ParameterText") or ""): (param.get("ValueText") or "")
                for param in p.get("Parameters", [])
            }
            return ComponentDetails(
                **base.model_dump(),
                specifications=specs,
                lifecycle_status=(p.get("ProductStatus") or {}).get("Status"),
                cad_assets=[],
            )

    async def fetch_pricing(self, part_id: str) -> Offer:
        details = await self.fetch_details(part_id)
        if not details.offers:
            raise ProviderError("digikey: no pricing returned")
        return details.offers[0]

    async def fetch_datasheet(self, part_id: str) -> str | None:
        return (await self.fetch_details(part_id)).datasheet_url

    async def fetch_models(self, part_id: str) -> list[CadAsset]:
        raise ProviderError("digikey: CAD models not offered; use snapmagic")
