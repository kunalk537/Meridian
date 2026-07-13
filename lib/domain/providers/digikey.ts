/**
 * DigiKey connector — Product Information API v4 (OAuth2 client credentials).
 * Ports componenthub_mcp/providers/digikey.py exactly.
 *
 * Capabilities: search, details, pricing, availability, datasheet.
 * Enable with DIGIKEY_CLIENT_ID / DIGIKEY_CLIENT_SECRET.
 */
import { digikeyClientId, digikeyClientSecret } from "../config";
import type {
  CadAsset,
  ComponentDetails,
  ComponentResult,
  Offer,
  SearchQuery,
} from "../models";
import { Capability } from "../models";
import { Provider, ProviderError } from "./base";

const API = "https://api.digikey.com";

export class DigiKeyProvider extends Provider {
  readonly name = "digikey";
  readonly displayName = "DigiKey";
  readonly capabilities = new Set([
    Capability.SEARCH,
    Capability.DETAILS,
    Capability.PRICING,
    Capability.AVAILABILITY,
    Capability.DATASHEET,
  ]);

  private _token: string | null = null;
  private _tokenExpiry: number = 0;

  isConfigured(): boolean {
    return Boolean(digikeyClientId() && digikeyClientSecret());
  }

  missingConfig(): string | null {
    if (this.isConfigured()) return null;
    return "Set DIGIKEY_CLIENT_ID and DIGIKEY_CLIENT_SECRET (developer.digikey.com).";
  }

  private async _getToken(): Promise<string> {
    if (this._token && Date.now() / 1000 < this._tokenExpiry - 60) {
      return this._token;
    }
    const clientId = digikeyClientId();
    const clientSecret = digikeyClientSecret();
    const resp = await fetch(`${API}/v1/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId ?? "",
        client_secret: clientSecret ?? "",
        grant_type: "client_credentials",
      }),
    });
    if (!resp.ok) {
      throw new ProviderError(`digikey: token request failed (${resp.status})`);
    }
    const data = (await resp.json()) as {
      access_token: string;
      expires_in?: number;
    };
    this._token = data.access_token;
    this._tokenExpiry = Date.now() / 1000 + (data.expires_in ?? 600);
    return this._token;
  }

  private async _headers(): Promise<Record<string, string>> {
    return {
      Authorization: `Bearer ${await this._getToken()}`,
      "X-DIGIKEY-Client-Id": digikeyClientId() ?? "",
      "X-DIGIKEY-Locale-Site": "US",
      "X-DIGIKEY-Locale-Currency": "USD",
    };
  }

  private _mapProduct(p: Record<string, unknown>): ComponentResult {
    const variations = (p.ProductVariations as Record<string, unknown>[]) ?? [{}];
    const best = variations[0] ?? {};
    const standardPricing = (best.StandardPricing as Record<string, unknown>[]) ?? [];
    const breaks = standardPricing.map((b) => ({
      quantity: (b.BreakQuantity as number) ?? 1,
      unit_price: (b.UnitPrice as number) ?? 0,
      currency: "USD",
    }));
    const packageType = best.PackageType as Record<string, unknown> | undefined;
    const manufacturer = p.Manufacturer as Record<string, unknown> | undefined;
    const description = p.Description as Record<string, unknown> | undefined;
    const category = p.Category as Record<string, unknown> | undefined;
    const offer: Offer = {
      provider: this.name,
      part_id:
        (best.DigiKeyProductNumber as string) ??
        (p.ManufacturerProductNumber as string) ??
        "",
      product_url: (p.ProductUrl as string) ?? null,
      stock: (p.QuantityAvailable as number) ?? null,
      price_breaks: breaks,
      packaging: (packageType?.Name as string) ?? null,
    };
    return {
      mpn: (p.ManufacturerProductNumber as string) ?? "",
      manufacturer: (manufacturer?.Name as string) ?? null,
      description: (description?.ProductDescription as string) ?? null,
      category: (category?.Name as string) ?? null,
      datasheet_url: (p.DatasheetUrl as string) ?? null,
      image_url: (p.PhotoUrl as string) ?? null,
      offers: [offer],
    };
  }

  async search(query: SearchQuery): Promise<ComponentResult[]> {
    const body: Record<string, unknown> = {
      Keywords: query.keyword,
      Limit: query.max_results,
      Offset: 0,
    };
    if (query.manufacturer) {
      body.FilterOptionsRequest = {
        ManufacturerFilter: [{ Id: query.manufacturer }],
      };
    }
    const resp = await fetch(`${API}/products/v4/search/keyword`, {
      method: "POST",
      headers: {
        ...(await this._headers()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new ProviderError(
        `digikey: search failed (${resp.status}): ${text.slice(0, 200)}`,
      );
    }
    const data = (await resp.json()) as { Products?: Record<string, unknown>[] };
    let results = (data.Products ?? []).map((p) => this._mapProduct(p));
    if (query.in_stock_only) {
      results = results.filter((r) =>
        r.offers.some((o) => (o.stock ?? 0) > 0),
      );
    }
    return results;
  }

  async fetchDetails(partId: string): Promise<ComponentDetails> {
    const resp = await fetch(
      `${API}/products/v4/search/${encodeURIComponent(partId)}/productdetails`,
      {
        method: "GET",
        headers: await this._headers(),
      },
    );
    if (!resp.ok) {
      throw new ProviderError(`digikey: details failed (${resp.status})`);
    }
    const data = (await resp.json()) as { Product: Record<string, unknown> };
    const p = data.Product;
    const base = this._mapProduct(p);
    const parameters = (p.Parameters as Record<string, unknown>[]) ?? [];
    const specs: Record<string, string> = {};
    for (const param of parameters) {
      const key = (param.ParameterText as string) ?? "";
      const val = (param.ValueText as string) ?? "";
      specs[key] = val;
    }
    const productStatus = p.ProductStatus as Record<string, unknown> | undefined;
    return {
      ...base,
      specifications: specs,
      lifecycle_status: (productStatus?.Status as string) ?? null,
      cad_assets: [],
    };
  }

  async fetchPricing(partId: string): Promise<Offer> {
    const details = await this.fetchDetails(partId);
    if (!details.offers.length) {
      throw new ProviderError("digikey: no pricing returned");
    }
    return details.offers[0];
  }

  async fetchDatasheet(partId: string): Promise<string | null> {
    return (await this.fetchDetails(partId)).datasheet_url ?? null;
  }

  async fetchModels(_partId: string): Promise<CadAsset[]> {
    throw new ProviderError("digikey: CAD models not offered; use snapmagic");
  }
}
