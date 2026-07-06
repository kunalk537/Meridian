"""Export Manager — browser-facing FastAPI routes.

The MCP tool `get_export_link` hands the user a URL to /export/{provider}/{part_id}.
Opening it in a browser shows a format picker (KiCad, Altium, EasyEDA, Fusion 360);
the download endpoint fetches the provider's assets live, bundles them into a zip
for the chosen tool, and streams it. Nothing is stored server-side.
"""

import io
import zipfile
from html import escape

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse, PlainTextResponse, StreamingResponse

from .models import CadAsset, ExportFormat
from .providers import ProviderError, get_provider
from .providers.demo import demo_asset_content

router = APIRouter()

_FORMAT_LABELS = {
    ExportFormat.KICAD: "KiCad",
    ExportFormat.ALTIUM: "Altium Designer",
    ExportFormat.EASYEDA: "EasyEDA",
    ExportFormat.FUSION360: "Fusion 360",
}


async def _gather_assets(provider_name: str, part_id: str) -> tuple[list[CadAsset], str | None]:
    provider = get_provider(provider_name)
    assets: list[CadAsset] = []
    datasheet: str | None = None
    try:
        assets = await provider.fetch_models(part_id)
    except ProviderError:
        pass
    try:
        datasheet = await provider.fetch_datasheet(part_id)
    except ProviderError:
        pass
    return assets, datasheet


@router.get("/export/{provider_name}/{part_id}", response_class=HTMLResponse)
async def export_page(provider_name: str, part_id: str) -> str:
    try:
        provider = get_provider(provider_name)
    except ProviderError as e:
        raise HTTPException(status_code=404, detail=str(e))
    assets, datasheet = await _gather_assets(provider_name, part_id)

    buttons = "".join(
        f'<a class="btn" href="/export/{escape(provider_name)}/{escape(part_id)}/download?fmt={fmt.value}">'
        f"Export for {label}</a>"
        for fmt, label in _FORMAT_LABELS.items()
    )
    asset_rows = "".join(
        f"<tr><td>{escape(a.kind)}</td><td>{escape(a.format)}</td>"
        f'<td><a href="{escape(a.url)}">{escape(a.filename)}</a></td></tr>'
        for a in assets
    ) or '<tr><td colspan="3">No CAD assets reported by this provider.</td></tr>'
    datasheet_html = (
        f'<p>Datasheet: <a href="{escape(datasheet)}">{escape(datasheet)}</a></p>' if datasheet else ""
    )

    return f"""<!doctype html>
<html><head><meta charset="utf-8"><title>Export {escape(part_id)} — ComponentHub</title>
<style>
 body {{ font-family: system-ui, sans-serif; max-width: 720px; margin: 3rem auto; padding: 0 1rem; color: #1a1a2e; }}
 h1 {{ font-size: 1.4rem; }} .prov {{ color: #666; }}
 .btn {{ display: inline-block; margin: .4rem .5rem .4rem 0; padding: .6rem 1.1rem; background: #2563eb;
        color: #fff; text-decoration: none; border-radius: 8px; }}
 .btn:hover {{ background: #1d4ed8; }}
 table {{ border-collapse: collapse; margin-top: 1rem; width: 100%; }}
 td, th {{ border: 1px solid #ddd; padding: .45rem .6rem; text-align: left; font-size: .9rem; }}
</style></head><body>
<h1>ComponentHub Export — {escape(part_id)}</h1>
<p class="prov">Provider: {escape(provider.display_name)}</p>
<p>Choose your PCB tool. ComponentHub bundles all available files for that format into a single download.</p>
{buttons}
{datasheet_html}
<h2 style="font-size:1.05rem">Available assets</h2>
<table><tr><th>Kind</th><th>Format</th><th>File</th></tr>{asset_rows}</table>
</body></html>"""


@router.get("/export/{provider_name}/{part_id}/download")
async def export_download(provider_name: str, part_id: str, fmt: ExportFormat) -> StreamingResponse:
    assets, datasheet = await _gather_assets(provider_name, part_id)
    chosen = [a for a in assets if a.format in (fmt.value, "universal")]
    if not chosen and not datasheet:
        raise HTTPException(status_code=404, detail=f"No exportable assets for {part_id} in {fmt.value}")

    buf = io.BytesIO()
    manifest_lines = [
        f"ComponentHub export for {part_id}",
        f"Provider: {provider_name}",
        f"Target tool: {_FORMAT_LABELS[fmt]}",
        "",
    ]
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            for asset in chosen:
                try:
                    resp = await client.get(asset.url)
                    content_type = resp.headers.get("content-type", "")
                    # Only bundle real files; keep HTML pages (e.g. provider part
                    # pages) as links in the manifest instead.
                    if resp.status_code == 200 and "text/html" not in content_type:
                        zf.writestr(asset.filename, resp.content)
                        manifest_lines.append(f"[bundled] {asset.filename} ({asset.kind})")
                    else:
                        manifest_lines.append(f"[link]    {asset.kind}: {asset.url}")
                except httpx.HTTPError:
                    manifest_lines.append(f"[link]    {asset.kind}: {asset.url}")
            if datasheet:
                manifest_lines.append(f"[link]    datasheet: {datasheet}")
            zf.writestr("MANIFEST.txt", "\n".join(manifest_lines) + "\n")
    buf.seek(0)

    filename = f"{part_id}_{fmt.value}_componenthub.zip"
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/demo-assets/{mpn}/{filename}", response_class=PlainTextResponse)
async def demo_asset(mpn: str, filename: str) -> str:
    content = demo_asset_content(mpn, filename)
    if content is None:
        raise HTTPException(status_code=404, detail="Unknown demo part")
    return content
