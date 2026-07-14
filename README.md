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

### Web app (Next.js)

```sh
npm install
cp .env.example .env.local
npm run dev          # http://localhost:3000
```

Opens the Meridian product UI: search, compare, detail pages, projects, and auth.
The MCP endpoint is built in at `/api/[transport]` — no separate server needed.

### MCP server (Python, for stdio / Claude Desktop)

```sh
uv sync
uv run main.py --stdio
```

Works out of the box with the built-in `demo` provider (clearly-labeled sample
catalog), so you can try the whole flow without any API keys.

### Connect from Claude Code (HTTP)

The web app's MCP endpoint requires a per-user API key — open the **MCP server**
modal in the app (sign in first) to get yours; it's generated automatically and
can be regenerated at any time.

```sh
claude mcp add --transport http componenthub http://127.0.0.1:3000/api/mcp \
  --header "Authorization: Bearer <your-api-key>"
```

### Connect from Claude Desktop (stdio)

```json
{
  "mcpServers": {
    "componenthub": {
      "command": "uv",
      "args": ["run", "--project", "/PATH/TO/componenthub_mcp", "main.py", "--stdio"]
    }
  }
}
```

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
| `octopart` | search, details, pricing, availability, datasheet (aggregates many sellers) | `NEXAR_CLIENT_ID`, `NEXAR_CLIENT_SECRET` |
| `lcsc` | search, details, pricing, availability, cad_models | built-in (via JLCSearch API, no key needed) |
| `snapmagic` | search, cad_models, datasheet | `SNAPMAGIC_TOKEN` |
| `ultralibrarian` | search, cad_models, datasheet | `ULTRA_LIBRARIAN_CLIENT_ID`, `ULTRA_LIBRARIAN_CLIENT_SECRET` |

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

Copy `.env.example` to `.env` and fill in the credentials you have — it is loaded
automatically on startup. All variables:

| Env var | Purpose | Default |
|---|---|---|
| `COMPONENTHUB_BASE_URL` | Public base URL used in export links | `http://127.0.0.1:8000` |
| `ENABLED_PROVIDERS` | Allowlist — only these providers are active (comma-separated) | all |
| `DISABLED_PROVIDERS` | Denylist — these providers are excluded (comma-separated) | none |
| `DIGIKEY_CLIENT_ID` / `DIGIKEY_CLIENT_SECRET` | DigiKey Product Information API v4 | — |
| `MOUSER_API_KEY` | Mouser Search API v1 | — |
| `NEXAR_CLIENT_ID` / `NEXAR_CLIENT_SECRET` | Octopart via Nexar GraphQL API | — |
| `SNAPMAGIC_TOKEN` | SnapMagic (SnapEDA) API | — |
| `ULTRA_LIBRARIAN_CLIENT_ID` / `ULTRA_LIBRARIAN_CLIENT_SECRET` | Ultra Librarian partner API | — |
| `ULTRA_LIBRARIAN_API_BASE` / `ULTRA_LIBRARIAN_TOKEN_URL` | Ultra Librarian endpoint overrides | official endpoints |

## Development

### Prerequisites

- **Node.js** >= 18 (for the web app)
- **npm** (ships with Node.js)
- **Python** >= 3.14 + **uv** (optional, for the Python MCP server)

### Setup

```sh
# 1. Clone and install dependencies
git clone <repo>
cd componenthub_mcp
npm install

# 2. Copy env and fill in any API keys you have
cp .env.example .env.local

# 3. Start the dev server
npm run dev        # → http://localhost:3000
```

The web app and MCP endpoint both run from the same Next.js server.

### Run the Python MCP server (optional)

```sh
uv sync            # install Python deps
uv run main.py     # HTTP on :8000, MCP at /mcp
uv run main.py --stdio  # stdio mode for Claude Desktop
```

### Verify

- **TypeScript**: `npm run typecheck` (`tsc --noEmit`)
- **Build**: `npm run build` (creates a production build)
- **Lint**: `npm run lint` (Next.js lint)

### Project structure

```
app/                          Next.js App Router pages & API routes
├── (app)/                    Authenticated product pages
│   ├── search/               Home / search screen
│   ├── results/              Results with table/cards + filters rail
│   ├── compare/              Compare screen + docked tray
│   ├── parts/[provider]/[id] Part detail (7 tabs)
│   └── projects/             Projects / BOM list
├── (auth)/                   Auth pages (sign-in, sign-up)
├── api/[transport]/route.ts  MCP server endpoint (TypeScript)
└── api/                      REST endpoints (search, part, pricing, etc.)
components/                   React components by feature
lib/                          Domain logic, providers, hooks, Supabase client
main.py                       Python MCP server entry point
componenthub_mcp/             Python MCP server package
```

### Environment variables

See [Configuration](#configuration) above. For local dev, edit `.env.local` — it is
gitignored. The demo provider works with no config at all.

### Testing

There are no automated tests yet. To manually test the full flow:

1. Run `npm run dev` and open http://localhost:3000
2. Search for a component on the search page
3. View results, compare parts, open detail pages
4. Sign in / sign up to test Supabase auth
5. Verify the MCP endpoint: connect from Claude Code or use `curl` with the API
   key from the MCP modal:

```sh
curl http://localhost:3000/api/mcp -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-api-key>" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

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
    demo.py  digikey.py  mouser.py  octopart.py
    jlcsearch.py  snapmagic.py  ultralibrarian.py
```
