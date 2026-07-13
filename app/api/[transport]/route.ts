import { z } from "zod";
import { createMcpHandler } from "mcp-handler";
import { allProviders, getProvider, ProviderError } from "@/lib/domain/providers/registry";
import { search, history } from "@/lib/domain/coordinator";
import { searchQuerySchema, Capability, excludeNone } from "@/lib/domain/models";
import { baseUrl } from "@/lib/domain/config";

export const runtime = "nodejs";
export const maxDuration = 60;

const INSTRUCTIONS =
  "ComponentHub: live electronic component search across distributor and CAD " +
  "providers. There is no component database — every call queries providers " +
  "live. Results are returned unranked; you (the assistant) do any comparison " +
  "or ranking the user wants. Typical flow: search_components → " +
  "get_component_details / get_pricing on the user's shortlist → when the user " +
  "picks a part, get_export_link and give them the URL to open in their " +
  "browser, where they choose their PCB tool (KiCad, Altium, EasyEDA, " +
  "Fusion 360) and download the bundled files. The 'demo' provider returns " +
  "built-in sample data for trying the server without API keys — tell the " +
  "user when data comes from it.";

function textContent(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
}

function err(message: string) {
  return { error: message };
}

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "list_providers",
      {
        title: "List Providers",
        description:
          "List all component data providers, their capabilities (search, pricing, " +
          "availability, datasheet, cad_models, details), and whether each is configured. " +
          "Unconfigured providers include a hint about which environment variable enables them.",
        inputSchema: {},
      },
      async () =>
        textContent({
          providers: Array.from(allProviders().values()).map((p) => ({
            name: p.name,
            display_name: p.displayName,
            capabilities: Array.from(p.capabilities).sort(),
            configured: p.isConfigured(),
            ...(p.missingConfig() ? { how_to_enable: p.missingConfig() } : {}),
          })),
        }),
    );

    server.registerTool(
      "search_components",
      {
        title: "Search Components",
        description:
          "Search for electronic components across providers simultaneously.\n\n" +
          "Translate the user's natural-language need into a distributor-style keyword " +
          '(e.g. "24V to 5V 3A buck regulator" → "buck regulator 5V 3A"). Results from ' +
          "all providers are normalized and merged by manufacturer part number, but NOT " +
          "ranked or filtered — present, compare, and rank them yourself. Each offer " +
          "includes the provider name and part_id to use with the detail tools.\n\n" +
          "Args:\n" +
          "    keyword: Search keywords (part number, category + key specs, etc.).\n" +
          "    providers: Provider names to search (see list_providers). Default: all configured.\n" +
          "    manufacturer: Optional manufacturer name filter.\n" +
          "    category: Optional category filter (supported by some providers).\n" +
          "    in_stock_only: Only return parts with stock available.\n" +
          "    max_results_per_provider: Cap per provider (default 10).",
        inputSchema: {
          keyword: z.string().min(1),
          providers: z.array(z.string()).nullish(),
          manufacturer: z.string().nullish(),
          category: z.string().nullish(),
          in_stock_only: z.boolean().default(false),
          max_results_per_provider: z.number().int().min(1).max(50).default(10),
        },
      },
      async ({
        keyword,
        providers,
        manufacturer,
        category,
        in_stock_only,
        max_results_per_provider,
      }) => {
        const query = searchQuerySchema.parse({
          keyword,
          manufacturer: manufacturer ?? null,
          category: category ?? null,
          in_stock_only: in_stock_only ?? false,
          max_results: Math.max(1, Math.min(max_results_per_provider ?? 10, 50)),
        });
        return textContent(await search(query, providers ?? null));
      },
    );

    server.registerTool(
      "get_component_details",
      {
        title: "Get Component Details",
        description:
          "Fetch full live details for one component from one provider: specifications, " +
          "package, lifecycle status, datasheet URL, pricing, stock, and CAD asset list. " +
          "Use the provider name and part_id from a search_components offer.",
        inputSchema: {
          provider: z.string(),
          part_id: z.string(),
        },
      },
      async ({ provider, part_id }) => {
        try {
          const p = getProvider(provider);
          const details = await p.fetchDetails(part_id);
          return textContent(excludeNone(details));
        } catch (e) {
          if (e instanceof ProviderError) return textContent(err(String(e)));
          throw e;
        }
      },
    );

    server.registerTool(
      "get_pricing",
      {
        title: "Get Pricing",
        description:
          "Fetch live pricing and stock for a component from one provider. " +
          "Returns quantity price breaks and current availability.",
        inputSchema: {
          provider: z.string(),
          part_id: z.string(),
        },
      },
      async ({ provider, part_id }) => {
        try {
          const p = getProvider(provider);
          const offer = await p.fetchPricing(part_id);
          return textContent(excludeNone(offer));
        } catch (e) {
          if (e instanceof ProviderError) return textContent(err(String(e)));
          throw e;
        }
      },
    );

    server.registerTool(
      "get_datasheet",
      {
        title: "Get Datasheet",
        description:
          "Get the datasheet URL for a component from one provider. The user (or you, " +
          "if you can fetch URLs) can read it for detailed electrical characteristics.",
        inputSchema: {
          provider: z.string(),
          part_id: z.string(),
        },
      },
      async ({ provider, part_id }) => {
        try {
          const p = getProvider(provider);
          const url = await p.fetchDatasheet(part_id);
          return textContent({ part_id, provider, datasheet_url: url });
        } catch (e) {
          if (e instanceof ProviderError) return textContent(err(String(e)));
          throw e;
        }
      },
    );

    server.registerTool(
      "get_cad_models",
      {
        title: "Get CAD Models",
        description:
          "List available CAD assets (schematic symbol, PCB footprint, 3D STEP model) " +
          "for a component from one provider, with per-format download URLs. " +
          "For a bundled download, use get_export_link instead.",
        inputSchema: {
          provider: z.string(),
          part_id: z.string(),
        },
      },
      async ({ provider, part_id }) => {
        try {
          const p = getProvider(provider);
          const assets = await p.fetchModels(part_id);
          return textContent({
            part_id,
            provider,
            cad_assets: assets.map((a) => excludeNone(a)),
          });
        } catch (e) {
          if (e instanceof ProviderError) return textContent(err(String(e)));
          throw e;
        }
      },
    );

    server.registerTool(
      "get_export_link",
      {
        title: "Get Export Link",
        description:
          "Get the ComponentHub export link for a component the user has selected.\n\n" +
          "Give this URL to the user to open in their browser. The export page lets them " +
          "pick their PCB tool (KiCad, Altium Designer, EasyEDA, Fusion 360) and downloads " +
          "all available files formatted for that tool. Also returns direct provider links " +
          "(product page, datasheet) as a fallback. Requires the ComponentHub HTTP server " +
          "to be running at the returned base URL.",
        inputSchema: {
          provider: z.string(),
          part_id: z.string(),
        },
      },
      async ({ provider, part_id }) => {
        try {
          const p = getProvider(provider);
          const result: Record<string, unknown> = {
            part_id,
            provider,
            export_url: `${baseUrl()}/api/export/${p.name}/${part_id}`,
            supported_formats: ["kicad", "altium", "easyeda", "fusion360"],
            instructions:
              "Open export_url in a browser, choose a PCB tool, and the download " +
              "starts with all available files bundled for that format.",
          };
          if (p.capabilities.has(Capability.DATASHEET)) {
            try {
              result.datasheet_url = await p.fetchDatasheet(part_id);
            } catch {
              // ignore
            }
          }
          return textContent(result);
        } catch (e) {
          if (e instanceof ProviderError) return textContent(err(String(e)));
          throw e;
        }
      },
    );

    server.registerTool(
      "recent_searches",
      {
        title: "Recent Searches",
        description:
          "Show this server's recent search history (query, timestamp, providers used, " +
          "result count). History is in-memory only — no component data is ever stored.",
        inputSchema: {},
      },
      async () => textContent({ searches: history() }),
    );
  },
  { serverInfo: { name: "componenthub", version: "1.0.0" } },
  { basePath: "/api" },
);

export { handler as GET, handler as POST, handler as DELETE };
