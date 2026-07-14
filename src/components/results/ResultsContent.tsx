"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, type SearchResponse, type ProviderInfo } from "@/lib/api-client";
import { useSearchHistory } from "@/lib/hooks/data";
import { useCompare } from "@/lib/hooks/useCompare";
import { Seg, Lbl } from "@/components/meridian";
import { cn } from "@/lib/utils";
import type { ComponentResult } from "@/lib/domain/models";
import { ParsingInterstitial } from "@/components/results/ParsingInterstitial";
import { ResultsTable } from "@/components/results/ResultsTable";
import { ResultsCards } from "@/components/results/ResultsCards";
import { RightRail, type FilterState } from "@/components/results/RightRail";
import { CopilotBar } from "@/components/copilot/CopilotBar";

type SortKey = "mpn" | "price" | "stock" | "match";
type Layout = "table" | "cards";

function detectDataset(q: string): "reg" | "esp" | "opamp" {
  const l = q.toLowerCase();
  if (/esp|wifi|bluetooth|ble|zigbee|thread|mcu/i.test(l)) return "esp";
  if (/op.?amp|amplifier|noise|offset|gain.?band/i.test(l)) return "opamp";
  return "reg";
}

function buildConstraints(q: string): { k: string; v: string }[] {
  const l = q.toLowerCase();
  const out: { k: string; v: string }[] = [];
  if (/buck|regulator|dc-dc|step.?down/i.test(l))
    out.push({ k: "Category", v: "DC-DC Buck" });
  if (/topology|sync|non.?sync/i.test(l))
    out.push({ k: "Topology", v: /sync/i.test(l) ? "Sync" : "Non-sync" });
  const vin = l.match(/(\d+)\s*v\s*(?:in|input|vin)/i);
  if (vin) out.push({ k: "Vin", v: `>= ${vin[1]} V` });
  const vout = l.match(/(\d+)\s*v\s*(?:out|output|vout)/i);
  if (vout) out.push({ k: "Vout", v: `${vout[1]} V` });
  const iout = l.match(/(\d+)\s*a(?:mp)?/i);
  if (iout) out.push({ k: "Iout", v: `>= ${iout[1]} A` });
  if (/esp|mcu|wifi|bluetooth/i.test(l)) {
    out.push({ k: "Category", v: "MCU / Module" });
    if (/wifi|wi-fi/i.test(l)) out.push({ k: "Wi-Fi", v: "Yes" });
    if (/bluetooth|ble/i.test(l)) out.push({ k: "Bluetooth", v: "BLE 5" });
    if (/usb/i.test(l)) out.push({ k: "USB", v: "Native" });
  }
  if (/op.?amp|amplifier/i.test(l)) {
    out.push({ k: "Category", v: "Op-Amp" });
    if (/noise|low.?noise/i.test(l)) out.push({ k: "Noise", v: "Low" });
    if (/5\s*v|5v/i.test(l)) out.push({ k: "Supply", v: "~5 V" });
    if (/precision|offset/i.test(l)) out.push({ k: "Offset", v: "Precision" });
  }
  if (/stock|in.?stock/i.test(l)) out.push({ k: "Stock", v: "In stock" });
  if (out.length === 0) out.push({ k: "Keyword", v: q });
  return out;
}

function bestPrice(r: ComponentResult): number | null {
  const prices = r.offers
    .flatMap((o) => o.price_breaks.map((b) => b.unit_price))
    .filter((p) => p > 0);
  return prices.length ? Math.min(...prices) : null;
}

function totalStock(r: ComponentResult): number {
  return r.offers.reduce((sum, o) => sum + (o.stock ?? 0), 0);
}

export function ResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const { record } = useSearchHistory();
  const { items: compareItems } = useCompare();

  const [phase, setPhase] = useState<"parsing" | "results">("parsing");
  const [data, setData] = useState<SearchResponse | null>(null);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [mode, setMode] = useState<"results" | "compare">("results");
  const [layout, setLayout] = useState<Layout>("table");
  const [sortKey, setSortKey] = useState<SortKey>("match");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [relaxed, setRelaxed] = useState<Set<number>>(new Set());
  const [filters, setFilters] = useState<FilterState>({
    inStockOnly: false,
    maxPrice: "",
    minStock: "",
    mfrExcluded: {},
  });

  useEffect(() => {
    if (!q) {
      router.replace("/search");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [searchRes, provRes] = await Promise.all([
          api.search({ keyword: q }),
          api.providers().catch(() => ({ providers: [] })),
        ]);
        if (!cancelled) {
          setData(searchRes);
          setProviders(provRes.providers);
        }
      } catch {
        if (!cancelled) setData({ results: [], providers_searched: [], providers_skipped: [], note: "Search failed" });
      }
    })();
    return () => { cancelled = true; };
  }, [q, router]);

  const recordedDataRef = useRef<SearchResponse | null>(null);

  useEffect(() => {
    if (!data || recordedDataRef.current === data) return;
    recordedDataRef.current = data;
    record.mutate({
      query: q,
      providers: data.providers_searched,
      result_count: data.results.length,
    });
  }, [data, q, record]);

  const constraints = useMemo(() => buildConstraints(q), [q]);
  const dataset = useMemo(() => detectDataset(q), [q]);

  const results = useMemo(() => {
    if (!data) return [];
    let filtered = data.results;
    if (filters.inStockOnly) {
      filtered = filtered.filter((r) => totalStock(r) > 0);
    }
    if (filters.maxPrice) {
      const mp = parseFloat(filters.maxPrice);
      if (!isNaN(mp)) filtered = filtered.filter((r) => { const p = bestPrice(r); return p !== null && p <= mp; });
    }
    if (filters.minStock) {
      const ms = parseInt(filters.minStock, 10);
      if (!isNaN(ms)) filtered = filtered.filter((r) => totalStock(r) >= ms);
    }
    const excluded = Object.entries(filters.mfrExcluded).filter(([, v]) => v).map(([k]) => k);
    if (excluded.length) {
      filtered = filtered.filter((r) => !excluded.includes(r.manufacturer ?? "Unknown"));
    }
    return filtered;
  }, [data, filters]);

  const hiddenCount = useMemo(() => {
    if (!data) return 0;
    return data.results.length - results.length;
  }, [data, results]);

  const sorted = useMemo(() => {
    const arr = [...results];
    arr.sort((a, b) => {
      const aPrice = bestPrice(a) ?? Infinity;
      const bPrice = bestPrice(b) ?? Infinity;
      const aStock = totalStock(a);
      const bStock = totalStock(b);
      switch (sortKey) {
        case "price": return sortDir === 1 ? aPrice - bPrice : bPrice - aPrice;
        case "stock": return sortDir === 1 ? aStock - bStock : bStock - aStock;
        case "mpn": return sortDir * a.mpn.localeCompare(b.mpn);
        default: return 0;
      }
    });
    return arr;
  }, [results, sortKey, sortDir]);

  const bestMpns = useMemo(() => {
    if (!sorted.length) return [];
    const prices = sorted.map((r) => bestPrice(r) ?? Infinity);
    const minPrice = Math.min(...prices);
    const idx = prices.indexOf(minPrice);
    return [sorted[idx]?.mpn].filter(Boolean) as string[];
  }, [sorted]);

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1));
      else { setSortKey(key); setSortDir(key === "match" ? -1 : 1); }
    },
    [sortKey],
  );

  const clearFilters = useCallback(() => {
    setFilters({ inStockOnly: false, maxPrice: "", minStock: "", mfrExcluded: {} });
  }, []);

  const parsingDone = useCallback(() => setPhase("results"), []);

  if (phase === "parsing" && !data) {
    return (
      <ParsingInterstitial
        query={q}
        constraints={constraints}
        providers={["LCSC", "DigiKey", "Mouser"]}
        onDone={parsingDone}
      />
    );
  }

  return (
    <div className="mx-auto max-w-[1220px] px-8 py-5 pb-32">
      {/* Mode toggle */}
      <div className="mb-4.5 flex justify-center">
        <Seg
          options={[
            { value: "results" as const, label: `Results \u00B7 ${data?.results.length ?? 0}` },
            { value: "compare" as const, label: `Compare \u00B7 ${compareItems.length}` },
          ]}
          value={mode}
          onChange={(v) => {
            setMode(v);
            if (v === "compare") router.push("/compare");
          }}
        />
      </div>

      {/* Recap + heading + edit query */}
      <div className="mb-3.5 flex items-start justify-between gap-5">
        <div className="min-w-0 flex-1">
          <Lbl className="mb-1.5">
            {data?.results.length ?? 0} candidates \u00B7 merged from{" "}
            {data?.providers_searched.length ?? 0} providers \u00B7 sorted by{" "}
            {sortKey === "match" ? "relevance" : sortKey}
          </Lbl>
          <h1 className="h1 text-[19px]">{q}</h1>
        </div>
        <button
          className="btn sm mt-0.5 flex-none"
          onClick={() => router.push("/search")}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
          Edit query
        </button>
      </div>

      {/* Constraint chips + layout toggle */}
      <div className="mb-3.5 flex flex-wrap items-center gap-2 border-b border-line pb-3.5">
        <Lbl className="flex-none">Constraints \u25B8</Lbl>
        {constraints.map((f, i) => (
          <span key={i} className={cn("chip", relaxed.has(i) && "rx")}>
            <span className="text-[8.5px] font-medium uppercase tracking-[0.14em] text-ink3">
              {f.k}
            </span>{" "}
            <span className="mono text-[11px]">{f.v}</span>
            <button
              className="chipb"
              onClick={() =>
                setRelaxed((prev) => {
                  const next = new Set(prev);
                  next.has(i) ? next.delete(i) : next.add(i);
                  return next;
                })
              }
            >
              {relaxed.has(i) ? "RESTORE" : "RELAX"}
            </button>
          </span>
        ))}
        <div className="flex-1" />
        <button
          className={cn("segbtn", layout === "table" && "on")}
          onClick={() => setLayout("table")}
        >
          Table
        </button>
        <button
          className={cn("segbtn", layout === "cards" && "on")}
          onClick={() => setLayout("cards")}
        >
          Cards
        </button>
      </div>

      {/* Copilot */}
      <CopilotBar surface="results" data={dataset} />

      {/* Results + Rail */}
      <div className="mt-4 grid gap-4" style={{ gridTemplateColumns: "minmax(0,1fr) 290px" }}>
        <div className="min-w-0">
          {layout === "table" ? (
            <ResultsTable
              results={sorted}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              bestMpns={bestMpns}
              dataset={dataset}
            />
          ) : (
            <ResultsCards results={sorted} bestMpns={bestMpns} />
          )}

          {hiddenCount > 0 && (
            <div className="panel mono mt-2.5 border-dashed px-3.5 py-2.5 text-[10.5px] text-ink3">
              <div className="flex items-center justify-between">
                <span>{hiddenCount} MORE RESULT(S) HIDDEN BY YOUR FILTERS</span>
                <button className="chipb" onClick={clearFilters}>
                  Clear filters
                </button>
              </div>
            </div>
          )}
        </div>

        <RightRail
          results={data?.results ?? []}
          filters={filters}
          onChange={setFilters}
          providers={providers}
          hiddenCount={hiddenCount}
          onClearFilters={clearFilters}
        />
      </div>
    </div>
  );
}
