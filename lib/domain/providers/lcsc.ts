/**
 * JLCSearch connector — keyless search via jlcsearch.tscircuit.com.
 *
 * Uses the public JLCSearch API (no authentication required) to search JLCPCB
 * in-stock components. Provides search, details, pricing, availability, and CAD
 * models. Datasheets are not available through this API.
 *
 * part_id is the LCSC product code (e.g. C15742).
 */
import type {
  CadAsset,
  Capability,
  ComponentDetails,
  ComponentResult,
  Offer,
  PriceBreak,
  SearchQuery,
} from "../models";
import { Provider, ProviderError } from "./base";

const JLCSEARCH_BASE = "https://jlcsearch.tscircuit.com";
const EASYEDA_VERSION = "6.4.19.5";
const HEADERS = { "User-Agent": "Mozilla/5.0 (ComponentHub MCP)" };

function toLcscNumber(partId: string): number {
  const code = partId.trim().toUpperCase();
  const stripped = code.startsWith("C") ? code.slice(1) : code;
  if (!/^\d+$/.test(stripped)) {
    throw new ProviderError(
      `jlcsearch: invalid LCSC code ${JSON.stringify(partId)} (expected C<number>)`,
    );
  }
  return parseInt(stripped, 10);
}

function toCNumber(lcsc: number | string): string {
  return `C${lcsc}`;
}

function productUrl(number: string): string {
  return `https://www.lcsc.com/product-detail/${number}.html`;
}

function parsePriceBreaks(raw: string | null | undefined): PriceBreak[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const breaks: PriceBreak[] = [];
  for (const tier of data) {
    const qty = (tier as Record<string, unknown>).qFrom;
    const price = (tier as Record<string, unknown>).price;
    if (qty != null && price != null) {
      const q = Number(qty);
      const p = Number(price);
      if (Number.isFinite(q) && Number.isFinite(p)) {
        breaks.push({ quantity: Math.round(q), unit_price: p, currency: "USD" });
      }
    }
  }
  return breaks;
}

export class LcscProvider extends Provider {
  readonly name = "lcsc";
  readonly displayName = "JLCPCB (via JLCSearch)";
  readonly capabilities: ReadonlySet<Capability> = new Set([
    "search",
    "details",
    "pricing",
    "availability",
    "cad_models",
  ] as Capability[]);

  isConfigured(): boolean {
    return true;
  }

  missingConfig(): string | null {
    return null;
  }

  private async get(path: string, params?: Record<string, string>): Promise<unknown> {
    const url = new URL(`${JLCSEARCH_BASE}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }
    }
    const resp = await fetch(url.toString(), {
      headers: HEADERS,
      signal: AbortSignal.timeout(20_000),
    });
    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      throw new ProviderError(
        `jlcsearch: request failed (${resp.status}): ${body.slice(0, 200)}`,
      );
    }
    return resp.json();
  }

  private mapComponent(comp: Record<string, unknown>): ComponentResult | null {
    const lcsc = comp.lcsc;
    if (!lcsc) return null;
    const number = toCNumber(lcsc as number | string);
    return {
      mpn: (comp.mfr as string) || number,
      description: (comp.description as string) ?? null,
      category: (comp.category as string) ?? null,
      package: (comp.package as string) ?? null,
      offers: [
        {
          provider: this.name,
          part_id: number,
          product_url: productUrl(number),
          stock: typeof comp.stock === "number" ? comp.stock : null,
          price_breaks: parsePriceBreaks(comp.price as string | null | undefined),
        },
      ],
    };
  }

  async search(query: SearchQuery): Promise<ComponentResult[]> {
    const params: Record<string, string> = {
      q: query.keyword,
      limit: String(query.max_results),
    };
    const data = (await this.get("/api/search", params)) as Record<string, unknown>;
    const components = (data.components ?? []) as Record<string, unknown>[];
    const results: ComponentResult[] = [];
    for (const comp of components) {
      const mapped = this.mapComponent(comp);
      if (!mapped) continue;
      if (
        query.manufacturer &&
        (!mapped.manufacturer ||
          !mapped.manufacturer.toLowerCase().includes(query.manufacturer.toLowerCase()))
      ) {
        continue;
      }
      if (query.in_stock_only && (typeof comp.stock === "number" ? comp.stock : 0) <= 0) {
        continue;
      }
      results.push(mapped);
    }
    return results;
  }

  async fetchDetails(partId: string): Promise<ComponentDetails> {
    const lcscNum = toLcscNumber(partId);
    const params: Record<string, string> = {
      search: String(lcscNum),
      full: "true",
    };
    const data = (await this.get("/components/list.json", params)) as Record<string, unknown>;
    const components = (data.components ?? []) as Record<string, unknown>[];
    const target = toCNumber(lcscNum).toUpperCase();
    for (const comp of components) {
      const compLcsc = (comp as Record<string, unknown>).lcsc;
      if (toCNumber(compLcsc != null ? (compLcsc as number | string) : 0).toUpperCase() === target) {
        const mapped = this.mapComponent(comp as Record<string, unknown>);
        if (!mapped) break;
        const cadAssets = await this.fetchModels(partId);
        return {
          ...mapped,
          specifications: {
            category: (comp.category as string) ?? "",
            subcategory: (comp.subcategory as string) ?? "",
            is_basic: String(comp.is_basic ?? false),
            is_preferred: String(comp.is_preferred ?? false),
          },
          cad_assets: cadAssets,
        };
      }
    }
    throw new ProviderError(`jlcsearch: part ${JSON.stringify(partId)} not found`);
  }

  async fetchPricing(partId: string): Promise<Offer> {
    const details = await this.fetchDetails(partId);
    return details.offers[0];
  }

  async fetchModels(partId: string): Promise<CadAsset[]> {
    return [
      {
        kind: "library",
        format: "easyeda",
        filename: `${partId}-easyeda-component.json`,
        url: `https://easyeda.com/api/products/${partId}/components?version=${EASYEDA_VERSION}`,
      },
      {
        kind: "symbol",
        format: "easyeda",
        filename: `${partId}-preview.json`,
        url: `https://easyeda.com/api/products/${partId}/svgs`,
      },
    ];
  }
}
