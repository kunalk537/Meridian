/**
 * Search coordinator — TS port of coordinator.py.
 * Fan searches out to providers, collect, normalize, merge by MPN. No ranking.
 *
 * NOTE: `history` is in-memory and therefore ephemeral on serverless (one warm
 * instance only). The web app persists real per-user history in Supabase via
 * lib/data/history.ts. This ring buffer exists for MCP `recent_searches` parity.
 */
import {
  Capability,
  type ComponentResult,
  excludeNone,
  type SearchQuery,
} from "./models";
import { allProviders, getProvider, Provider, ProviderError } from "./providers/registry";

interface SkipReason {
  provider: string;
  reason: string;
}
interface HistoryEntry {
  query: string;
  timestamp: string;
  providers: string[];
  result_count: number;
}

const HISTORY_MAX = 50;
const historyRing: HistoryEntry[] = [];

export function resolveProviders(
  names: string[] | null | undefined,
  capability: Capability,
): { usable: Provider[]; skipped: SkipReason[] } {
  const skipped: SkipReason[] = [];
  const candidates = names && names.length
    ? names.map((n) => getProvider(n))
    : [...allProviders().values()];
  const usable: Provider[] = [];
  for (const p of candidates) {
    if (!p.capabilities.has(capability)) {
      if (names && names.length) {
        skipped.push({ provider: p.name, reason: `does not support ${capability}` });
      }
      continue;
    }
    if (!p.isConfigured()) {
      skipped.push({ provider: p.name, reason: p.missingConfig() ?? "not configured" });
      continue;
    }
    usable.push(p);
  }
  return { usable, skipped };
}

/** Merge results from different providers that refer to the same MPN. */
function merge(results: ComponentResult[]): ComponentResult[] {
  const merged = new Map<string, ComponentResult>();
  let anon = 0;
  for (const r of results) {
    const key = r.mpn.trim().toUpperCase();
    if (!key) {
      merged.set(`__anon_${anon++}`, r);
      continue;
    }
    const existing = merged.get(key);
    if (existing) {
      existing.offers.push(...r.offers);
      existing.manufacturer = existing.manufacturer || r.manufacturer;
      existing.description = existing.description || r.description;
      existing.category = existing.category || r.category;
      existing.package = existing.package || r.package;
      existing.datasheet_url = existing.datasheet_url || r.datasheet_url;
      existing.image_url = existing.image_url || r.image_url;
      if (r.specifications) {
        existing.specifications ??= {};
        for (const [k, v] of Object.entries(r.specifications)) {
          if (!(k in existing.specifications)) existing.specifications[k] = v;
        }
      }
    } else {
      merged.set(key, structuredClone(r));
    }
  }
  return [...merged.values()];
}

export interface SearchResponse {
  results: ComponentResult[];
  providers_searched: string[];
  providers_skipped: SkipReason[];
  note: string;
}

export async function search(
  query: SearchQuery,
  providerNames: string[] | null | undefined,
): Promise<SearchResponse> {
  const { usable, skipped } = resolveProviders(providerNames, Capability.SEARCH);
  const errors: SkipReason[] = [...skipped];

  const runOne = async (p: Provider): Promise<ComponentResult[]> => {
    try {
      return await p.search(query);
    } catch (e) {
      const reason =
        e instanceof ProviderError ? e.message : `unexpected error: ${String(e)}`;
      errors.push({ provider: p.name, reason });
      return [];
    }
  };

  const batches = await Promise.all(usable.map(runOne));
  const flat = batches.flat();
  const merged = merge(flat);

  historyRing.unshift({
    query: query.keyword,
    timestamp: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
    providers: usable.map((p) => p.name),
    result_count: merged.length,
  });
  if (historyRing.length > HISTORY_MAX) historyRing.length = HISTORY_MAX;

  return {
    results: merged.map((r) => excludeNone(r)),
    providers_searched: usable.map((p) => p.name),
    providers_skipped: errors,
    note: "Results are unranked and unfiltered — compare and rank them yourself as needed.",
  };
}

export function history(): HistoryEntry[] {
  return [...historyRing];
}
