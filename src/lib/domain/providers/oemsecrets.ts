/**
 * OEMsecrets connector — Part Search API v3 (API key).
 * https://oemsecretsapi.com/documentation
 *
 * OEMsecrets is an aggregator: `partsearch` returns one row per distributor
 * offer for parts matching the search term, so rows are grouped here by
 * (source part number, manufacturer) into a single result with many offers —
 * same shape as the Octopart connector.
 *
 * Capabilities: search, details, pricing, availability, datasheet.
 * Enable with OEMSECRETS_API_KEY (oemsecrets.com/api — trial keys are capped
 * at 10 requests/day, so results are cached in-memory for a few minutes to
 * avoid burning quota on repeat lookups within a warm instance).
 */
import { oemsecretsApiKey, oemsecretsCountryCode, oemsecretsCurrency } from "../config";
import type {
  CadAsset,
  ComponentDetails,
  ComponentResult,
  Offer,
  PriceBreak,
  SearchQuery,
} from "../models";
import { Capability } from "../models";
import { Provider, ProviderError } from "./base";

const API = "https://oemsecretsapi.com";
const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  expires: number;
  data: Record<string, unknown>[];
}

const searchCache = new Map<string, CacheEntry>();

/** Strips OEMsecrets' analytics redirect wrapper, exposing the real target URL. */
function unwrapUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (!url.includes("analytics.oemsecrets.com/main.php")) return url;
  try {
    const eventLink = new URL(url).searchParams.get("event_link");
    return eventLink || url;
  } catch {
    return url;
  }
}

interface Group {
  mpn: string;
  manufacturer: string | null;
  description: string | null;
  category: string | null;
  datasheetUrl: string | null;
  imageUrl: string | null;
  lifecycleStatus: string | null;
  offers: Offer[];
}

export class OemsecretsProvider extends Provider {
  readonly name = "oemsecrets";
  readonly displayName = "OEMsecrets";
  readonly capabilities = new Set([
    Capability.SEARCH,
    Capability.DETAILS,
    Capability.PRICING,
    Capability.AVAILABILITY,
    Capability.DATASHEET,
  ]);

  isConfigured(): boolean {
    return Boolean(oemsecretsApiKey());
  }

  missingConfig(): string | null {
    if (this.isConfigured()) return null;
    return "Set OEMSECRETS_API_KEY (oemsecrets.com/api).";
  }

  private async _search(term: string): Promise<Record<string, unknown>[]> {
    const apiKey = oemsecretsApiKey();
    if (!apiKey) {
      throw new ProviderError("oemsecrets: OEMSECRETS_API_KEY is required");
    }
    const currency = oemsecretsCurrency();
    const countryCode = oemsecretsCountryCode();
    const cacheKey = `${term.toLowerCase()}|${currency}|${countryCode ?? ""}`;
    const cached = searchCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }

    const params = new URLSearchParams({ searchTerm: term, apiKey, currency });
    if (countryCode) params.set("countryCode", countryCode);

    const resp = await fetch(`${API}/partsearch?${params.toString()}`);
    if (!resp.ok) {
      const text = await resp.text();
      throw new ProviderError(
        `oemsecrets: search failed (${resp.status}): ${text.slice(0, 200)}`,
      );
    }
    const data = (await resp.json()) as { stock?: Record<string, unknown>[] };
    const stock = Array.isArray(data.stock) ? data.stock : [];
    searchCache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, data: stock });
    return stock;
  }

  private _extractPriceBreaks(product: Record<string, unknown>): PriceBreak[] {
    const prices = product.prices as Record<string, { unit_break: unknown; unit_price: unknown }[]> | undefined;
    if (!prices) return [];
    const preferred = oemsecretsCurrency();
    const sourceCurrency = product.source_currency as string | undefined;
    const currency = prices[preferred] ? preferred : sourceCurrency;
    const tiers = currency ? prices[currency] : undefined;
    if (!currency || !tiers) return [];

    const breaks: PriceBreak[] = [];
    for (const tier of tiers) {
      const quantity = Number(tier.unit_break);
      const unitPrice = parseFloat(String(tier.unit_price));
      if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice) || unitPrice <= 0) continue;
      breaks.push({ quantity, unit_price: unitPrice, currency });
    }
    return breaks;
  }

  private _groupKey(product: Record<string, unknown>): string | null {
    const mpn = (product.source_part_number as string) || (product.part_number as string);
    const manufacturer = product.manufacturer as string;
    if (!mpn || !manufacturer) return null;
    return `${mpn.trim().toLowerCase()}|${manufacturer.trim().toLowerCase()}`;
  }

  private _group(products: Record<string, unknown>[]): Map<string, Group> {
    const groups = new Map<string, Group>();
    for (const product of products) {
      const key = this._groupKey(product);
      if (!key) continue;

      let group = groups.get(key);
      if (!group) {
        group = {
          mpn: (product.source_part_number as string) || (product.part_number as string),
          manufacturer: (product.manufacturer as string) ?? null,
          description: (product.description as string) || null,
          category: (product.category as string) || null,
          datasheetUrl: unwrapUrl(product.datasheet_url as string | undefined),
          imageUrl: unwrapUrl(product.image_url as string | undefined),
          lifecycleStatus: (product.life_cycle as string) || null,
          offers: [],
        };
        groups.set(key, group);
      } else {
        group.description ||= (product.description as string) || null;
        group.category ||= (product.category as string) || null;
        group.datasheetUrl ||= unwrapUrl(product.datasheet_url as string | undefined);
        group.imageUrl ||= unwrapUrl(product.image_url as string | undefined);
        group.lifecycleStatus ||= (product.life_cycle as string) || null;
      }

      const distributor = product.distributor as Record<string, unknown> | undefined;
      const distributorName = distributor?.distributor_name as string | undefined;
      if (!distributorName) continue;

      const stockRaw = product.quantity_in_stock;
      const stock = stockRaw === undefined ? null : Number(stockRaw);
      group.offers.push({
        provider: this.name,
        part_id: (product.sku as string) || group.mpn,
        seller: distributorName,
        product_url: unwrapUrl(product.buy_now_url as string | undefined),
        stock: Number.isFinite(stock) ? stock : null,
        price_breaks: this._extractPriceBreaks(product),
      });
    }
    return groups;
  }

  private _toResult(group: Group): ComponentResult {
    return {
      mpn: group.mpn,
      manufacturer: group.manufacturer,
      description: group.description,
      category: group.category,
      datasheet_url: group.datasheetUrl,
      image_url: group.imageUrl,
      offers: group.offers,
    };
  }

  async search(query: SearchQuery): Promise<ComponentResult[]> {
    const products = await this._search(query.keyword);
    let results = [...this._group(products).values()].map((g) => this._toResult(g));
    if (query.manufacturer) {
      const needle = query.manufacturer.toLowerCase();
      results = results.filter((r) => r.manufacturer?.toLowerCase().includes(needle));
    }
    if (query.in_stock_only) {
      results = results.filter((r) => r.offers.some((o) => (o.stock ?? 0) > 0));
    }
    return results.slice(0, query.max_results);
  }

  private async _findGroup(partId: string): Promise<Group> {
    const products = await this._search(partId);
    const groups = this._group(products);
    const needle = partId.trim().toLowerCase();
    for (const group of groups.values()) {
      if (group.mpn.trim().toLowerCase() === needle) return group;
    }
    const first = groups.values().next().value as Group | undefined;
    if (!first) {
      throw new ProviderError(`oemsecrets: part ${JSON.stringify(partId)} not found`);
    }
    return first;
  }

  async fetchDetails(partId: string): Promise<ComponentDetails> {
    const group = await this._findGroup(partId);
    return {
      ...this._toResult(group),
      specifications: {},
      lifecycle_status: group.lifecycleStatus,
      cad_assets: [],
    };
  }

  async fetchPricing(partId: string): Promise<Offer> {
    const group = await this._findGroup(partId);
    const priced = group.offers.find((o) => o.price_breaks.length > 0);
    if (!priced) {
      throw new ProviderError(`oemsecrets: no pricing for ${JSON.stringify(partId)}`);
    }
    return priced;
  }

  async fetchDatasheet(partId: string): Promise<string | null> {
    return (await this.fetchDetails(partId)).datasheet_url ?? null;
  }

  async fetchModels(_partId: string): Promise<CadAsset[]> {
    throw new ProviderError("oemsecrets: CAD models not offered; use snapmagic or ultralibrarian");
  }
}
