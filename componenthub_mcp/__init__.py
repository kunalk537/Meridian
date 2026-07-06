"""ComponentHub MCP — an MCP server for electronic component search.

Exposes ComponentHub's provider connectors (DigiKey, Mouser, SnapMagic, ...)
as MCP tools so any AI chat can search parts, fetch live details/pricing/CAD
availability, and hand the user an export link. No ranking or AI comparison
happens here — the connected LLM does that with the raw results.
"""

__version__ = "0.1.0"
