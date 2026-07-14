/**
 * Shared data models — TypeScript port of componenthub_mcp/models.py.
 * Normalization is in-memory per request; nothing is stored.
 */
import { z } from "zod";

export enum Capability {
  SEARCH = "search",
  DETAILS = "details",
  PRICING = "pricing",
  AVAILABILITY = "availability",
  DATASHEET = "datasheet",
  CAD_MODELS = "cad_models",
}

export enum ExportFormat {
  KICAD = "kicad",
  ALTIUM = "altium",
  EASYEDA = "easyeda",
  FUSION360 = "fusion360",
}

export const searchQuerySchema = z.object({
  keyword: z.string().min(1),
  manufacturer: z.string().nullish(),
  category: z.string().nullish(),
  in_stock_only: z.boolean().default(false),
  max_results: z.number().int().min(1).max(50).default(10),
});
export type SearchQuery = z.infer<typeof searchQuerySchema>;

export interface PriceBreak {
  quantity: number;
  unit_price: number;
  currency: string; // default "USD"
}

export interface Offer {
  provider: string;
  /** Provider-specific identifier, used for detail lookups */
  part_id: string;
  /** Set when the provider aggregates other sellers (e.g. Octopart) */
  seller?: string | null;
  product_url?: string | null;
  stock?: number | null;
  price_breaks: PriceBreak[];
  packaging?: string | null;
}

export interface ComponentResult {
  mpn: string;
  manufacturer?: string | null;
  description?: string | null;
  category?: string | null;
  package?: string | null;
  datasheet_url?: string | null;
  image_url?: string | null;
  offers: Offer[];
  specifications?: Record<string, string>;
}

export interface CadAsset {
  /** symbol | footprint | step | library | datasheet */
  kind: string;
  /** kicad | altium | easyeda | fusion360 | universal */
  format: string;
  filename: string;
  url: string;
}

export interface ComponentDetails extends ComponentResult {
  specifications: Record<string, string>;
  lifecycle_status?: string | null;
  cad_assets: CadAsset[];
}

/**
 * Mirror of Pydantic's `.model_dump(exclude_none=True)` — recursively drops
 * keys whose value is null or undefined so JSON responses match the Python API.
 */
export function excludeNone<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => excludeNone(v)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === null || v === undefined) continue;
      out[k] = excludeNone(v);
    }
    return out as T;
  }
  return value;
}
