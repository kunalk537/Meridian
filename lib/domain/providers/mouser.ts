/**
 * Mouser connector — Search API v1 (API key).
 * Ports componenthub_mcp/providers/mouser.py exactly.
 *
 * Capabilities: search, details, pricing, availability, datasheet.
 * Enable with MOUSER_API_KEY (mouser.com/api-hub).
 */
import { mouserApiKey } from "../config";
import type {
  CadAsset,
  ComponentDetails,
  ComponentResult,
  Offer,
  SearchQuery,
} from "../models";
import { Capability } from "../models";
import { Provider, ProviderError } from "./base";

const API = "https://api.mouser.com/api/v1";

function parsePrice(text: string | null | undefined): number | null {
  if (!text) return null;
  const cleaned = text.replace(/[^\d.,]/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? null : n;
}

export class MouserProvider extends Provider {
  readonly name = "mouser";
  readonly displayName = "Mouser Electronics";
  readonly capabilities = new Set([
    Capability.SEARCH,
    Capability.DETAILS,
    Capability.PRICING,
    Capability.AVAILABILITY,
    Capability.DATASHEET,
  ]);

  isConfigured(): boolean {
    return Boolean(mouserApiKey());
  }

  missingConfig(): string | null {
    if (this.isConfigured()) return null;
    return "Set MOUSER_API_KEY (mouser.com/api-hub).";
  }

  private _mapPart(p: Record<string, unknown>): ComponentResult {
    const priceBreaks = (p.PriceBreaks as Record<string, unknown>[]) ?? [];
    const breaks: { quantity: number; unit_price: number; currency: string }[] =
      [];
    for (const b of priceBreaks) {
      const price = parsePrice(b.Price as string);
      if (price !== null) {
        breaks.push({
          quantity: (b.Quantity as number) ?? 1,
          unit_price: price,
          currency: (b.Currency as string) ?? "USD",
        });
      }
    }
    const availability = (p.Availability as string) ?? "";
    const stockMatch = availability.match(/\d+/);
    const offer: Offer = {
      provider: this.name,
      part_id:
        (p.MouserPartNumber as string) ??
        (p.ManufacturerPartNumber as string) ??
        "",
      product_url: (p.ProductDetailUrl as string) ?? null,
      stock: stockMatch ? parseInt(stockMatch[0], 10) : null,
      price_breaks: breaks,
    };
    return {
      mpn: (p.ManufacturerPartNumber as string) ?? "",
      manufacturer: (p.Manufacturer as string) ?? null,
      description: (p.Description as string) ?? null,
      category: (p.Category as string) ?? null,
      datasheet_url: (p.DataSheetUrl as string) || null,
      image_url: (p.ImagePath as string) || null,
      offers: [offer],
    };
  }

  private async _keywordSearch(
    keyword: string,
    records: number,
  ): Promise<Record<string, unknown>[]> {
    const apiKey = mouserApiKey();
    const resp = await fetch(
      `${API}/search/keyword?apiKey=${encodeURIComponent(apiKey ?? "")}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          SearchByKeywordRequest: {
            keyword,
            records,
            startingRecord: 0,
          },
        }),
      },
    );
    if (!resp.ok) {
      const text = await resp.text();
      throw new ProviderError(
        `mouser: search failed (${resp.status}): ${text.slice(0, 200)}`,
      );
    }
    const data = (await resp.json()) as {
      Errors?: { Message?: string }[];
      SearchResults?: { Parts?: Record<string, unknown>[] };
    };
    const errors = data.Errors ?? [];
    if (errors.length) {
      throw new ProviderError(
        `mouser: ${errors[0].Message ?? "API error"}`,
      );
    }
    return data.SearchResults?.Parts ?? [];
  }

  async search(query: SearchQuery): Promise<ComponentResult[]> {
    const parts = await this._keywordSearch(query.keyword, query.max_results);
    let results = parts.map((p) => this._mapPart(p));
    if (query.manufacturer) {
      const needle = query.manufacturer.toLowerCase();
      results = results.filter(
        (r) => r.manufacturer?.toLowerCase().includes(needle),
      );
    }
    if (query.in_stock_only) {
      results = results.filter((r) =>
        r.offers.some((o) => (o.stock ?? 0) > 0),
      );
    }
    return results;
  }

  async fetchDetails(partId: string): Promise<ComponentDetails> {
    const parts = await this._keywordSearch(partId, 1);
    if (!parts.length) {
      throw new ProviderError(`mouser: part ${JSON.stringify(partId)} not found`);
    }
    const p = parts[0];
    const base = this._mapPart(p);
    const attrs = (p.ProductAttributes as Record<string, unknown>[]) ?? [];
    const specs: Record<string, string> = {};
    for (const attr of attrs) {
      const key = (attr.AttributeName as string) ?? "";
      const val = (attr.AttributeValue as string) ?? "";
      specs[key] = val;
    }
    return {
      ...base,
      specifications: specs,
      lifecycle_status: (p.LifecycleStatus as string) ?? null,
      cad_assets: [],
    };
  }

  async fetchPricing(partId: string): Promise<Offer> {
    const details = await this.fetchDetails(partId);
    if (!details.offers.length) {
      throw new ProviderError("mouser: no pricing returned");
    }
    return details.offers[0];
  }

  async fetchDatasheet(partId: string): Promise<string | null> {
    return (await this.fetchDetails(partId)).datasheet_url ?? null;
  }

  async fetchModels(_partId: string): Promise<CadAsset[]> {
    throw new ProviderError("mouser: CAD models not offered; use snapmagic");
  }
}
