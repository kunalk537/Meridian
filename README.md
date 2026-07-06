# ComponentHub MCP

An MCP server version of **ComponentHub** — the AI component search engine — usable
from any AI chat that speaks MCP (Claude Desktop, Claude Code, Cursor, etc.).

The AI assistant part of ComponentHub is replaced by *your* chat session: this server
just provides live component data. It does **no ranking and no AI comparison** — it
returns all normalized results and the LLM you're chatting with compares, ranks, and
summarizes with its own knowledge. There is no component database, no crawling, no
indexing: every call queries the selected providers live, and normalization happens
in memory per request.

```
Your AI chat (LLM)                      ComponentHub MCP (FastAPI)
──────────────────                      ──────────────────────────
"24V→5V regulator, 3A"  ──────────────▶ search_components
                        ◀────────────── all merged results (unranked)
LLM compares & ranks
"give me the export link" ────────────▶ get_export_link
                        ◀────────────── http://…/export/demo/LM2596S-5.0
User opens link in browser ───────────▶ picks KiCad / Altium / EasyEDA / Fusion 360
                        ◀────────────── zip with all files for that tool
```

## Quick start

```sh
uv sync
uv run main.py            # HTTP mode: MCP endpoint at http://127.0.0.1:8000/mcp
uv run main.py --stdio    # stdio mode: for clients that spawn the server
```

Works out of the box with the built-in `demo` provider (clearly-labeled sample
catalog), so you can try the whole flow without any API keys.

### Connect from Claude Code

```sh
claude mcp add --transport http componenthub http://127.0.0.1:8000/mcp
```

### Connect from Claude Desktop (stdio)

```json
{
  "mcpServers": {
    "componenthub": {
      "command": "uv",
      "args": ["run", "--project", "/path/to/componenthub_mcp", "main.py", "--stdio"]
    }
  }
}
```

Export links require the HTTP server to be running too (`uv run main.py`), since the
export pages are served by the same FastAPI app.

## MCP tools

| Tool | What it does |
|---|---|
| `list_providers` | Providers, their capabilities, and configuration status |
| `search_components` | Fan-out live search across selected providers; merged by MPN, unranked |
| `get_component_details` | Full specs, package, lifecycle, pricing, stock, CAD assets |
| `get_pricing` | Live price breaks and stock from one provider |
| `get_datasheet` | Datasheet URL |
| `get_cad_models` | Symbol / footprint / STEP availability and URLs |
| `get_export_link` | Browser link to the export page for the selected part |
| `recent_searches` | In-memory search history (query, time, providers — never components) |

## Providers (capability-based)

Providers are capabilities, not websites. The coordinator asks "who can answer this
part of the request?" and only calls providers that declare — and are configured
for — the needed capability. Unconfigured providers are skipped and reported in
`providers_skipped` with a hint on how to enable them.

| Provider | Capabilities | Enable with |
|---|---|---|
| `demo` | search, details, pricing, availability, datasheet, cad_models | built-in (sample data) |
| `digikey` | search, details, pricing, availability, datasheet | `DIGIKEY_CLIENT_ID`, `DIGIKEY_CLIENT_SECRET` |
| `mouser` | search, details, pricing, availability, datasheet | `MOUSER_API_KEY` |
| `snapmagic` | search, cad_models, datasheet | `SNAPMAGIC_TOKEN` |

Add a provider: subclass `Provider` in `componenthub_mcp/providers/`, declare its
capabilities, implement the fetchers it supports, and register it in
`providers/__init__.py`.

## Export flow

1. User picks a part in chat and asks for the export link.
2. `get_export_link` returns `{COMPONENTHUB_BASE_URL}/export/{provider}/{part_id}`.
3. The user opens it in a browser, chooses their PCB tool (KiCad, Altium Designer,
   EasyEDA, Fusion 360), and gets a zip with every available file for that format
   plus a manifest. Assets are fetched live from the provider — nothing is stored.

## Configuration

| Env var | Purpose | Default |
|---|---|---|
| `COMPONENTHUB_BASE_URL` | Public base URL used in export links | `http://127.0.0.1:8000` |
| `DIGIKEY_CLIENT_ID` / `DIGIKEY_CLIENT_SECRET` | DigiKey Product Information API v4 | — |
| `MOUSER_API_KEY` | Mouser Search API v1 | — |
| `SNAPMAGIC_TOKEN` | SnapMagic (SnapEDA) API | — |

## Layout

```
main.py                        entry point (HTTP or stdio)
componenthub_mcp/
  server.py                    FastMCP tools + FastAPI app (MCP mounted at /mcp)
  coordinator.py               search fan-out, normalization, MPN merge, history
  export.py                    export pages + zip bundling (browser-facing)
  models.py                    shared pydantic models
  config.py                    env-based configuration
  providers/
    base.py                    capability-based Provider interface
    demo.py  digikey.py  mouser.py  snapmagic.py
```
