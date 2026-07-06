"""ComponentHub MCP server.

MCP tools expose the search coordinator, provider capabilities, and export
manager. The FastAPI app serves the MCP endpoint at /mcp (streamable HTTP)
alongside the browser-facing export routes. The same FastMCP instance also
runs over stdio via `python main.py --stdio`.
"""

from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from mcp.server.fastmcp import FastMCP

from . import config, coordinator
from .export import router as export_router
from .models import Capability, SearchQuery
from .providers import ProviderError, all_providers, get_provider

mcp = FastMCP(
    "componenthub",
    instructions=(
        "ComponentHub: live electronic component search across distributor and CAD "
        "providers. There is no component database — every call queries providers "
        "live. Results are returned unranked; you (the assistant) do any comparison "
        "or ranking the user wants. Typical flow: search_components → "
        "get_component_details / get_pricing on the user's shortlist → when the user "
        "picks a part, get_export_link and give them the URL to open in their "
        "browser, where they choose their PCB tool (KiCad, Altium, EasyEDA, "
        "Fusion 360) and download the bundled files. The 'demo' provider returns "
        "built-in sample data for trying the server without API keys — tell the "
        "user when data comes from it."
    ),
    stateless_http=True,
    json_response=True,
)


def _err(message: str) -> dict[str, Any]:
    return {"error": message}


@mcp.tool()
async def list_providers() -> dict[str, Any]:
    """List all component data providers, their capabilities (search, pricing,
    availability, datasheet, cad_models, details), and whether each is configured.
    Unconfigured providers include a hint about which environment variable enables them."""
    return {
        "providers": [
            {
                "name": p.name,
                "display_name": p.display_name,
                "capabilities": sorted(c.value for c in p.capabilities),
                "configured": p.is_configured(),
                **({"how_to_enable": p.missing_config()} if p.missing_config() else {}),
            }
            for p in all_providers().values()
        ]
    }


@mcp.tool()
async def search_components(
    keyword: str,
    providers: list[str] | None = None,
    manufacturer: str | None = None,
    category: str | None = None,
    in_stock_only: bool = False,
    max_results_per_provider: int = 10,
) -> dict[str, Any]:
    """Search for electronic components across providers simultaneously.

    Translate the user's natural-language need into a distributor-style keyword
    (e.g. "24V to 5V 3A buck regulator" → "buck regulator 5V 3A"). Results from
    all providers are normalized and merged by manufacturer part number, but NOT
    ranked or filtered — present, compare, and rank them yourself. Each offer
    includes the provider name and part_id to use with the detail tools.

    Args:
        keyword: Search keywords (part number, category + key specs, etc.).
        providers: Provider names to search (see list_providers). Default: all configured.
        manufacturer: Optional manufacturer name filter.
        category: Optional category filter (supported by some providers).
        in_stock_only: Only return parts with stock available.
        max_results_per_provider: Cap per provider (default 10).
    """
    query = SearchQuery(
        keyword=keyword,
        manufacturer=manufacturer,
        category=category,
        in_stock_only=in_stock_only,
        max_results=max(1, min(max_results_per_provider, 50)),
    )
    return await coordinator.search(query, providers)


@mcp.tool()
async def get_component_details(provider: str, part_id: str) -> dict[str, Any]:
    """Fetch full live details for one component from one provider: specifications,
    package, lifecycle status, datasheet URL, pricing, stock, and CAD asset list.
    Use the provider name and part_id from a search_components offer."""
    try:
        p = get_provider(provider)
        details = await p.fetch_details(part_id)
        return details.model_dump(exclude_none=True)
    except ProviderError as e:
        return _err(str(e))


@mcp.tool()
async def get_pricing(provider: str, part_id: str) -> dict[str, Any]:
    """Fetch live pricing and stock for a component from one provider.
    Returns quantity price breaks and current availability."""
    try:
        p = get_provider(provider)
        offer = await p.fetch_pricing(part_id)
        return offer.model_dump(exclude_none=True)
    except ProviderError as e:
        return _err(str(e))


@mcp.tool()
async def get_datasheet(provider: str, part_id: str) -> dict[str, Any]:
    """Get the datasheet URL for a component from one provider. The user (or you,
    if you can fetch URLs) can read it for detailed electrical characteristics."""
    try:
        p = get_provider(provider)
        url = await p.fetch_datasheet(part_id)
        return {"part_id": part_id, "provider": provider, "datasheet_url": url}
    except ProviderError as e:
        return _err(str(e))


@mcp.tool()
async def get_cad_models(provider: str, part_id: str) -> dict[str, Any]:
    """List available CAD assets (schematic symbol, PCB footprint, 3D STEP model)
    for a component from one provider, with per-format download URLs.
    For a bundled download, use get_export_link instead."""
    try:
        p = get_provider(provider)
        assets = await p.fetch_models(part_id)
        return {
            "part_id": part_id,
            "provider": provider,
            "cad_assets": [a.model_dump() for a in assets],
        }
    except ProviderError as e:
        return _err(str(e))


@mcp.tool()
async def get_export_link(provider: str, part_id: str) -> dict[str, Any]:
    """Get the ComponentHub export link for a component the user has selected.

    Give this URL to the user to open in their browser. The export page lets them
    pick their PCB tool (KiCad, Altium Designer, EasyEDA, Fusion 360) and downloads
    all available files formatted for that tool. Also returns direct provider links
    (product page, datasheet) as a fallback. Requires the ComponentHub HTTP server
    to be running at the returned base URL."""
    try:
        p = get_provider(provider)
    except ProviderError as e:
        return _err(str(e))

    result: dict[str, Any] = {
        "part_id": part_id,
        "provider": provider,
        "export_url": f"{config.base_url()}/export/{p.name}/{part_id}",
        "supported_formats": ["kicad", "altium", "easyeda", "fusion360"],
        "instructions": (
            "Open export_url in a browser, choose a PCB tool, and the download "
            "starts with all available files bundled for that format."
        ),
    }
    if Capability.DATASHEET in p.capabilities:
        try:
            result["datasheet_url"] = await p.fetch_datasheet(part_id)
        except ProviderError:
            pass
    return result


@mcp.tool()
async def recent_searches() -> dict[str, Any]:
    """Show this server's recent search history (query, timestamp, providers used,
    result count). History is in-memory only — no component data is ever stored."""
    return {"searches": coordinator.history()}


@asynccontextmanager
async def _lifespan(app: FastAPI):
    async with mcp.session_manager.run():
        yield


app = FastAPI(
    title="ComponentHub MCP",
    description="MCP server + export endpoints for ComponentHub component search.",
    lifespan=_lifespan,
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(export_router)
# MCP streamable-HTTP endpoint lives at /mcp inside this sub-app.
app.mount("/", mcp.streamable_http_app())
