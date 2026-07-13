/**
 * Ultra Librarian connector — symbols, footprints, and STEP models.
 *
 * Ultra Librarian's REST API is partner-gated (developers.ultralibrarian.com) and
 * uses OAuth2 client credentials. Endpoint paths follow their published API; if
 * your partner account uses a different base or identity server, override with
 * ULTRA_LIBRARIAN_API_BASE / ULTRA_LIBRARIAN_TOKEN_URL.
 *
 * Capabilities: search, cad_models, datasheet.
 * Enable with ULTRA_LIBRARIAN_CLIENT_ID / ULTRA_LIBRARIAN_CLIENT_SECRET.
 */
import {
  ultralibrarianApiBase,
  ultralibrarianClientId,
  ultralibrarianClientSecret,
  ultralibrarianTokenUrl,
} from "../config";
import type { CadAsset, ComponentResult, SearchQuery } from "../models";
import { Capability } from "../models";
import { Provider, ProviderError } from "./base";

export class UltraLibrarianProvider extends Provider {
  readonly name = "ultralibrarian";
  readonly displayName = "Ultra Librarian";
  readonly capabilities = new Set([Capability.SEARCH, Capability.CAD_MODELS, Capability.DATASHEET]);

  private _token: string | null = null;
  private _tokenExpiry = 0;

  isConfigured(): boolean {
    return Boolean(ultralibrarianClientId() && ultralibrarianClientSecret());
  }

  missingConfig(): string | null {
    if (this.isConfigured()) return null;
    return "Set ULTRA_LIBRARIAN_CLIENT_ID and ULTRA_LIBRARIAN_CLIENT_SECRET (developers.ultralibrarian.com)";
  }

  private async _getToken(): Promise<string> {
    if (this._token && Date.now() < this._tokenExpiry - 60_000) {
      return this._token;
    }
    const clientId = ultralibrarianClientId();
    const clientSecret = ultralibrarianClientSecret();
    if (!clientId || !clientSecret) {
      throw new ProviderError(
        "ultralibrarian: ULTRA_LIBRARIAN_CLIENT_ID and ULTRA_LIBRARIAN_CLIENT_SECRET are required",
      );
    }
    const resp = await fetch(ultralibrarianTokenUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    if (!resp.ok) {
      throw new ProviderError(`ultralibrarian: token request failed (${resp.status})`);
    }
    const data = (await resp.json()) as {
      access_token: string;
      expires_in?: number;
    };
    this._token = data.access_token;
    this._tokenExpiry = Date.now() + (data.expires_in ?? 3600) * 1000;
    return this._token;
  }

  private async _get(path: string, params: Record<string, string>): Promise<Record<string, unknown>> {
    const token = await this._getToken();
    const qs = new URLSearchParams(params).toString();
    const resp = await fetch(`${ultralibrarianApiBase()}${path}?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      throw new ProviderError(
        `ultralibrarian: request failed (${resp.status}): ${body.slice(0, 200)}`,
      );
    }
    return (await resp.json()) as Record<string, unknown>;
  }

  private _mapPart(p: Record<string, unknown>): ComponentResult {
    const mpn = ((p.partNumber as string) || (p.PartNumber as string)) || "";
    let manufacturer = (p.manufacturer ?? p.Manufacturer) as string | Record<string, unknown> | undefined;
    if (typeof manufacturer === "object" && manufacturer !== null) {
      manufacturer =
        ((manufacturer as Record<string, unknown>).name as string) ||
        ((manufacturer as Record<string, unknown>).Name as string);
    }
    const page =
      ((p.detailsUrl as string) || (p.DetailsUrl as string)) ||
      `https://app.ultralibrarian.com/search?queryText=${mpn}`;
    return {
      mpn,
      manufacturer: typeof manufacturer === "string" ? manufacturer : null,
      description: ((p.description as string) || (p.Description as string)) ?? null,
      package: ((p.package as string) || (p.Package as string)) ?? null,
      datasheet_url: ((p.datasheetUrl as string) || (p.DatasheetUrl as string)) ?? null,
      offers: [{ provider: this.name, part_id: mpn, product_url: page, price_breaks: [] }],
    };
  }

  private async _searchRaw(keyword: string, limit: number): Promise<Array<Record<string, unknown>>> {
    const data = await this._get("/v1/parts/search", {
      queryText: keyword,
      pageRecords: String(limit),
      startRecord: "0",
    });
    return ((data.parts ?? data.Parts ?? data.results) as Array<Record<string, unknown>>) || [];
  }

  async search(query: SearchQuery): Promise<ComponentResult[]> {
    const parts = await this._searchRaw(query.keyword, query.max_results);
    const results: ComponentResult[] = [];
    for (const p of parts) {
      const r = this._mapPart(p);
      if (
        query.manufacturer &&
        (!r.manufacturer || !r.manufacturer.toLowerCase().includes(query.manufacturer.toLowerCase()))
      ) {
        continue;
      }
      results.push(r);
    }
    return results.slice(0, query.max_results);
  }

  private async _findPart(partId: string): Promise<Record<string, unknown>> {
    const parts = await this._searchRaw(partId, 10);
    for (const p of parts) {
      if (((p.partNumber as string) || (p.PartNumber as string) || "").toLowerCase() === partId.toLowerCase()) {
        return p;
      }
    }
    throw new ProviderError(`ultralibrarian: part ${JSON.stringify(partId)} not found`);
  }

  async fetchModels(partId: string): Promise<CadAsset[]> {
    const p = await this._findPart(partId);
    const page =
      ((p.detailsUrl as string) || (p.DetailsUrl as string)) ||
      `https://app.ultralibrarian.com/search?queryText=${partId}`;
    const assets: CadAsset[] = [];
    const flags: [string, unknown][] = [
      ["symbol", p.hasSymbol ?? p.HasSymbol],
      ["footprint", p.hasFootprint ?? p.HasFootprint],
      ["step", p.has3dModel ?? p.Has3DModel],
    ];
    for (const [kind, available] of flags) {
      if (available) {
        assets.push({ kind, format: "universal", filename: `${partId}-${kind}`, url: page });
      }
    }
    if (!assets.length) {
      assets.push({ kind: "library", format: "universal", filename: partId, url: page });
    }
    return assets;
  }

  async fetchDatasheet(partId: string): Promise<string | null> {
    return this._mapPart(await this._findPart(partId)).datasheet_url ?? null;
  }
}
