/**
 * SnapMagic (formerly SnapEDA) connector — CAD symbols, footprints, 3D models.
 *
 * Capabilities: search, CAD models, datasheet.
 * Enable with SNAPMAGIC_TOKEN (snapeda.com/api).
 */
import { snapmagicToken } from "../config";
import type { CadAsset, ComponentResult, SearchQuery } from "../models";
import { Capability } from "../models";
import { Provider, ProviderError } from "./base";

const API_BASE = "https://www.snapeda.com/api/v1";

export class SnapMagicProvider extends Provider {
  readonly name = "snapmagic";
  readonly displayName = "SnapMagic (SnapEDA)";
  readonly capabilities = new Set([Capability.SEARCH, Capability.CAD_MODELS, Capability.DATASHEET]);

  isConfigured(): boolean {
    return Boolean(snapmagicToken());
  }

  missingConfig(): string | null {
    if (this.isConfigured()) return null;
    return "Set SNAPMAGIC_TOKEN (snapeda.com/api)";
  }

  private async _searchRaw(keyword: string, limit: number): Promise<Array<Record<string, unknown>>> {
    const token = snapmagicToken();
    if (!token) {
      throw new ProviderError("snapmagic: SNAPMAGIC_TOKEN is required");
    }
    const params = new URLSearchParams({ q: keyword, limit: String(limit), token });
    const resp = await fetch(`${API_BASE}/parts/search?${params}`, {
      redirect: "follow",
    });
    if (!resp.ok) {
      throw new ProviderError(`snapmagic: search failed (${resp.status})`);
    }
    const data = (await resp.json()) as {
      error?: string;
      results?: Array<Record<string, unknown>>;
    };
    if (data.error) {
      throw new ProviderError(`snapmagic: ${data.error}`);
    }
    return data.results || [];
  }

  private _mapPart(p: Record<string, unknown>): ComponentResult {
    const mpn = (p.part_number as string) || "";
    let manufacturer = p.manufacturer as string | Record<string, unknown> | undefined;
    if (typeof manufacturer === "object" && manufacturer !== null) {
      manufacturer = (manufacturer as Record<string, unknown>).name as string;
    }
    let page = (p.url as string) || `https://www.snapeda.com/parts/${mpn}/`;
    if (page.startsWith("/")) {
      page = `https://www.snapeda.com${page}`;
    }
    const offer = { provider: this.name, part_id: mpn, product_url: page, price_breaks: [] };
    const ds = p.datasheet;
    let datasheetUrl: string | null = null;
    if (typeof ds === "object" && ds !== null) {
      datasheetUrl = ((ds as Record<string, unknown>).url as string) ?? null;
    } else if (typeof ds === "string") {
      datasheetUrl = ds;
    }
    return {
      mpn,
      manufacturer: typeof manufacturer === "string" ? manufacturer : null,
      description: ((p.short_description as string) || (p.description as string)) ?? null,
      package: (p.package as string) ?? null,
      datasheet_url: datasheetUrl,
      offers: [offer],
    };
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

  async fetchModels(partId: string): Promise<CadAsset[]> {
    const parts = await this._searchRaw(partId, 5);
    for (const p of parts) {
      if ((p.part_number as string || "").toLowerCase() !== partId.toLowerCase()) continue;
      let page = (p.url as string) || `https://www.snapeda.com/parts/${partId}/`;
      if (page.startsWith("/")) {
        page = `https://www.snapeda.com${page}`;
      }
      const assets: CadAsset[] = [];
      if (p.has_symbol) {
        assets.push({ kind: "symbol", format: "universal", filename: `${partId}-symbol`, url: page });
      }
      if (p.has_footprint) {
        assets.push({ kind: "footprint", format: "universal", filename: `${partId}-footprint`, url: page });
      }
      if (p.has_3d_model) {
        assets.push({ kind: "step", format: "universal", filename: `${partId}.step`, url: page });
      }
      return assets;
    }
    throw new ProviderError(`snapmagic: part ${JSON.stringify(partId)} not found`);
  }

  async fetchDatasheet(partId: string): Promise<string | null> {
    const parts = await this._searchRaw(partId, 5);
    for (const p of parts) {
      if ((p.part_number as string || "").toLowerCase() === partId.toLowerCase()) {
        return this._mapPart(p).datasheet_url ?? null;
      }
    }
    return null;
  }
}
