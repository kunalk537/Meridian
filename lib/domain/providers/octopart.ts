/**
 * Octopart connector — via the official Nexar GraphQL API (Octopart's platform).
 *
 * Octopart is an aggregator: one search returns offers from many distributors, so
 * each result carries multiple offers with the seller field set.
 *
 * Capabilities: search, details, pricing, availability, datasheet.
 * Enable with NEXAR_CLIENT_ID / NEXAR_CLIENT_SECRET (nexar.com, Supply scope).
 */
import { nexarClientId, nexarClientSecret } from "../config";
import type {
  ComponentDetails,
  ComponentResult,
  Offer,
  PriceBreak,
  SearchQuery,
} from "../models";
import { Capability } from "../models";
import { Provider, ProviderError } from "./base";

const TOKEN_URL = "https://identity.nexar.com/connect/token";
const GRAPHQL_URL = "https://api.nexar.com/graphql";
const MAX_SELLERS = 5;

const PART_FIELDS = `
  mpn
  manufacturer { name }
  shortDescription
  category { name }
  bestDatasheet { url }
  octopartUrl
  specs { attribute { name } displayValue }
  sellers(includeBrokers: false) {
    company { name }
    offers {
      clickUrl
      inventoryLevel
      packaging
      prices { quantity price currency }
    }
  }
`;

const SEARCH_QUERY = `
query ($q: String!, $limit: Int!) {
  supSearch(q: $q, limit: $limit) {
    results { part { ${PART_FIELDS} } }
  }
}
`;

const MPN_QUERY = `
query ($q: String!) {
  supSearchMpn(q: $q, limit: 1) {
    results { part { ${PART_FIELDS} } }
  }
}
`;

export class OctopartProvider extends Provider {
  readonly name = "octopart";
  readonly displayName = "Octopart (via Nexar)";
  readonly capabilities = new Set([
    Capability.SEARCH,
    Capability.DETAILS,
    Capability.PRICING,
    Capability.AVAILABILITY,
    Capability.DATASHEET,
  ]);

  private _token: string | null = null;
  private _tokenExpiry = 0;

  isConfigured(): boolean {
    return Boolean(nexarClientId() && nexarClientSecret());
  }

  missingConfig(): string | null {
    if (this.isConfigured()) return null;
    return "Set NEXAR_CLIENT_ID and NEXAR_CLIENT_SECRET (nexar.com — Octopart's API platform)";
  }

  private async _getToken(): Promise<string> {
    if (this._token && Date.now() < this._tokenExpiry - 60_000) {
      return this._token;
    }
    const clientId = nexarClientId();
    const clientSecret = nexarClientSecret();
    if (!clientId || !clientSecret) {
      throw new ProviderError("octopart: NEXAR_CLIENT_ID and NEXAR_CLIENT_SECRET are required");
    }
    const resp = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
        scope: "supply.domain",
      }),
    });
    if (!resp.ok) {
      throw new ProviderError(`octopart: Nexar token request failed (${resp.status})`);
    }
    const data = (await resp.json()) as {
      access_token: string;
      expires_in?: number;
    };
    this._token = data.access_token;
    this._tokenExpiry = Date.now() + (data.expires_in ?? 3600) * 1000;
    return this._token;
  }

  private async _graphql(query: string, variables: Record<string, unknown>): Promise<Record<string, unknown>> {
    const token = await this._getToken();
    const resp = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query, variables }),
    });
    if (!resp.ok) {
      throw new ProviderError(`octopart: GraphQL request failed (${resp.status})`);
    }
    const data = (await resp.json()) as {
      errors?: Array<{ message?: string }>;
      data?: Record<string, unknown>;
    };
    if (data.errors?.length) {
      throw new ProviderError(`octopart: ${data.errors[0].message ?? "GraphQL error"}`);
    }
    return data.data ?? {};
  }

  private _mapPart(part: Record<string, unknown>): ComponentResult {
    const mpn = (part.mpn as string) || "";
    const offers: Offer[] = [];
    const sellers = (part.sellers as Array<Record<string, unknown>>) || [];
    for (const seller of sellers.slice(0, MAX_SELLERS)) {
      const company = ((seller.company as Record<string, unknown>) || {}).name as string | undefined;
      for (const o of (seller.offers as Array<Record<string, unknown>>) || []) {
        const breaks: PriceBreak[] = ((o.prices as Array<Record<string, unknown>>) || []).map((p) => ({
          quantity: (p.quantity as number) ?? 1,
          unit_price: (p.price as number) ?? 0,
          currency: (p.currency as string) || "USD",
        }));
        offers.push({
          provider: this.name,
          part_id: mpn,
          seller: company,
          product_url: (o.clickUrl as string) || (part.octopartUrl as string),
          stock: (o.inventoryLevel as number) ?? null,
          price_breaks: breaks,
          packaging: (o.packaging as string) ?? null,
        });
        break; // one offer per seller keeps results compact
      }
    }
    if (!offers.length) {
      offers.push({
        provider: this.name,
        part_id: mpn,
        product_url: part.octopartUrl as string,
        price_breaks: [],
      });
    }
    return {
      mpn,
      manufacturer: ((part.manufacturer as Record<string, unknown>) || {}).name as string | null,
      description: (part.shortDescription as string) ?? null,
      category: ((part.category as Record<string, unknown>) || {}).name as string | null,
      datasheet_url: ((part.bestDatasheet as Record<string, unknown>) || {}).url as string | null,
      offers,
    };
  }

  private async _findPart(partId: string): Promise<Record<string, unknown>> {
    const data = await this._graphql(MPN_QUERY, { q: partId });
    const results =
      ((data.supSearchMpn as Record<string, unknown>)?.results as Array<Record<string, unknown>>) || [];
    if (!results.length) {
      throw new ProviderError(`octopart: part ${JSON.stringify(partId)} not found`);
    }
    return results[0].part as Record<string, unknown>;
  }

  async search(query: SearchQuery): Promise<ComponentResult[]> {
    const data = await this._graphql(SEARCH_QUERY, { q: query.keyword, limit: query.max_results });
    const results: ComponentResult[] = [];
    for (const entry of ((data.supSearch as Record<string, unknown>)?.results as Array<Record<string, unknown>>) || []) {
      const r = this._mapPart((entry.part as Record<string, unknown>) || {});
      if (
        query.manufacturer &&
        (!r.manufacturer || !r.manufacturer.toLowerCase().includes(query.manufacturer.toLowerCase()))
      ) {
        continue;
      }
      if (query.in_stock_only && !r.offers.some((o) => (o.stock ?? 0) > 0)) {
        continue;
      }
      results.push(r);
    }
    return results;
  }

  async fetchDetails(partId: string): Promise<ComponentDetails> {
    const part = await this._findPart(partId);
    const base = this._mapPart(part);
    const specs: Record<string, string> = {};
    for (const s of (part.specs as Array<Record<string, unknown>>) || []) {
      const key = ((s.attribute as Record<string, unknown>) || {}).name as string;
      const val = (s.displayValue as string) || "";
      if (key) specs[key] = val;
    }
    return { ...base, specifications: specs, cad_assets: [] };
  }

  async fetchPricing(partId: string): Promise<Offer> {
    const details = await this.fetchDetails(partId);
    const priced = details.offers.filter((o) => o.price_breaks.length > 0);
    if (!priced.length) {
      throw new ProviderError(`octopart: no pricing for ${JSON.stringify(partId)}`);
    }
    return priced[0];
  }

  async fetchDatasheet(partId: string): Promise<string | null> {
    return (await this.fetchDetails(partId)).datasheet_url ?? null;
  }
}
