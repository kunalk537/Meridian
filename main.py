"""ComponentHub MCP server entry point.

HTTP mode (default): serves the MCP endpoint at /mcp plus browser export pages.
    uv run main.py [--host 127.0.0.1] [--port 8000]

Stdio mode: for MCP clients that launch servers as subprocesses (Claude Desktop,
Claude Code, etc.). Export links point at COMPONENTHUB_BASE_URL, so run the HTTP
server too if you want the export pages to resolve.
    uv run main.py --stdio
"""

import argparse

import uvicorn

from componenthub_mcp.server import app, mcp


def main() -> None:
    parser = argparse.ArgumentParser(description="ComponentHub MCP server")
    parser.add_argument("--stdio", action="store_true", help="run over stdio instead of HTTP")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()

    if args.stdio:
        mcp.run(transport="stdio")
    else:
        uvicorn.run(app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()
