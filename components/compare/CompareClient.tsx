"use client";

/**
 * Full compare page — shows up to 3 parts side-by-side with parameter rows
 * (spec keys unioned across parts), highlighting the best price / stock per row.
 * Fetches details for each useCompare().items via api.part().
 */
import { useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { useCompare } from "@/lib/hooks/useCompare";
import { api } from "@/lib/api-client";
import { formatUsd, formatStock } from "@/lib/utils";
import type { ComponentDetails } from "@/lib/domain/models";

/* Demo catalog subset for the "+ Add part" affordance */
const DEMO_PARTS: { mpn: string; desc: string }[] = [
  { mpn: "LM2596S-5.0", desc: "Buck regulator 5V 3A" },
  { mpn: "TPS54331DR", desc: "Buck converter 3A Eco-mode" },
  { mpn: "ESP32-S3-WROOM-1-N8", desc: "Wi-Fi+BLE module 8MB" },
  { mpn: "STM32F405RGT6", desc: "ARM MCU 168MHz 1MB" },
  { mpn: "AMS1117-3.3", desc: "LDO regulator 3.3V 1A" },
  { mpn: "NE5532P", desc: "Dual low-noise op-amp" },
  { mpn: "USB4110-GF-A", desc: "USB-C receptacle 2.0" },
  { mpn: "ESP32-C6-WROOM-1-N8", desc: "Wi-Fi 6 module 8MB" },
];

/** Lowest unit price across all offers, or null. */
function bestPrice(d: ComponentDetails): number | null {
  let best: number | null = null;
  for (const o of d.offers) {
    for (const pb of o.price_breaks) {
      if (best === null || pb.unit_price < best) best = pb.unit_price;
    }
  }
  return best;
}

export function CompareClient() {
  const { items, remove, clear, toggle } = useCompare();
  const [addOpen, setAddOpen] = useState(false);

  /* Fetch details for every compared part */
  const queries = useQueries({
    queries: items.map((it) => ({
      queryKey: ["part", it.provider, it.part_id],
      queryFn: () => api.part(it.provider, it.part_id),
      staleTime: 30_000,
    })),
  });

  const loading = queries.some((q) => q.isLoading);
  const parts: ComponentDetails[] = queries
    .filter((q) => q.data)
    .map((q) => q.data!);

  const hasEnough = parts.length >= 2;

  /* Union of all spec keys */
  const specKeys: string[] = [];
  parts.forEach((p) => {
    Object.keys(p.specifications).forEach((k) => {
      if (!specKeys.includes(k)) specKeys.push(k);
    });
  });

  /* Dynamic grid columns */
  const gridCols = `minmax(140px,1fr) repeat(${Math.max(items.length, 1)},minmax(150px,1.1fr))`;

  /* Best price index (lowest) */
  const prices = parts.map((p) => bestPrice(p));
  const minPrice = prices.reduce<number | null>(
    (m, p) => (p !== null && (m === null || p < m) ? p : m),
    null,
  );
  const bestPriceIdx = prices.indexOf(minPrice);

  /* Best stock index (highest) */
  const stocks = parts.map((p) =>
    p.offers.reduce((s, o) => s + (o.stock ?? 0), 0),
  );
  const maxStock = Math.max(...stocks, 0);
  const bestStockIdx = stocks.indexOf(maxStock);

  /* Candidate parts for the add dropdown (not already compared) */
  const comparedMpnSet = new Set(items.map((i) => i.mpn));
  const candidates = DEMO_PARTS.filter((dp) => !comparedMpnSet.has(dp.mpn));

  /* --- Build table rows --- */
  interface Cell {
    v: string;
    best: boolean;
  }
  interface Row {
    label: string;
    cells: Cell[];
  }

  const rows: Row[] = [];

  if (hasEnough) {
    /* Price row */
    rows.push({
      label: "Price (unit)",
      cells: prices.map((p, i) => ({
        v: p !== null ? formatUsd(p) : "—",
        best: i === bestPriceIdx && minPrice !== null,
      })),
    });

    /* Stock row */
    rows.push({
      label: "Stock",
      cells: stocks.map((s, i) => ({
        v: formatStock(s),
        best: i === bestStockIdx && maxStock > 0,
      })),
    });

    /* Available at (provider names) */
    rows.push({
      label: "Available at",
      cells: parts.map((p) => ({
        v: [...new Set(p.offers.map((o) => o.provider))].join(", ") || "—",
        best: false,
      })),
    });

    /* Spec rows (union of keys) */
    for (const key of specKeys) {
      const vals = parts.map((p) => p.specifications[key] ?? "—");
      const allSame = vals.every((v) => v === vals[0]);
      rows.push({
        label: key,
        cells: vals.map((v) => ({
          v,
          best: allSame && vals[0] !== "—",
        })),
      });
    }
  }

  /* --- Copilot summary --- */
  let summary = "";
  if (hasEnough && parts.length >= 2 && minPrice !== null) {
    const cheapestIdx = bestPriceIdx;
    const cheapestMpn = parts[cheapestIdx].mpn;
    const bestMpn = parts.reduce((best, p) =>
      p.offers.reduce((s, o) => s + (o.stock ?? 0), 0) >
      best.offers.reduce((s, o) => s + (o.stock ?? 0), 0)
        ? p
        : best,
    ).mpn;
    summary = `${cheapestMpn} is the lowest-cost option at ${formatUsd(minPrice)}. `;
    if (bestMpn !== cheapestMpn) {
      summary += `${bestMpn} has the highest stock (${formatStock(maxStock)} units). `;
    }
    summary += `Review the specifications above to determine the best fit for your design.`;
  }

  return (
    <div className="mx-auto max-w-[1040px] px-8 pb-[130px] pt-5">
      {/* Header row */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="sub mt-0">
            Up to three parts side by side — the best price and stock in each
            row are highlighted. Remove a part with ✕ or pull in another with
            Add part.
          </p>
        </div>
        <div className="flex flex-none gap-2">
          {items.length < 3 && (
            <div className="relative">
              <button
                className="btn sm pri"
                onClick={() => setAddOpen(!addOpen)}
              >
                ＋ Add part ▾
              </button>
              {addOpen && candidates.length > 0 && (
                <div className="panel fu absolute right-0 top-8 z-15 w-[260px] border-line2 p-1">
                  {candidates.map((c) => (
                    <button
                      key={c.mpn}
                      className="nv border-l-none text-[12px]"
                      onClick={() => {
                        toggle({ provider: "demo", part_id: c.mpn, mpn: c.mpn });
                        setAddOpen(false);
                      }}
                    >
                      <span className="mono text-[11.5px] font-semibold">
                        {c.mpn}
                      </span>
                      <span className="flex-1" />
                      <span className="mono text-[10px] text-ink3">
                        {c.desc}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button className="btn sm" onClick={clear}>
            Clear all
          </button>
        </div>
      </div>

      {/* Loading indicator */}
      {loading && items.length > 0 && (
        <div className="sub py-4">Loading part details…</div>
      )}

      {/* Compare table (≥2 parts) */}
      {hasEnough && (
        <div className="panel overflow-x-auto">
          {/* Header row */}
          <div
            className="items-end border-b border-line2 px-4 py-4"
            style={{ display: "grid", gridTemplateColumns: gridCols, gap: 12 }}
          >
            <div className="lbl">Parameter</div>
            {parts.map((p, i) => (
              <div key={items[i].part_id} className="relative min-w-0">
                <button
                  className="chipb absolute -top-1 right-0"
                  onClick={() => remove(items[i].part_id)}
                >
                  ✕
                </button>
                <div className="mono text-[14px] font-bold">{p.mpn}</div>
                {p.manufacturer && (
                  <div className="lbl mt-0.5" style={{ fontSize: "8.5px" }}>
                    {p.manufacturer}
                  </div>
                )}
                <div className="mono mt-2 text-[13px] font-semibold text-acc">
                  {formatUsd(bestPrice(p))}
                </div>
              </div>
            ))}
          </div>

          {/* Data rows */}
          {rows.map((r, ri) => (
            <div
              key={r.label}
              style={{
                display: "grid",
                gridTemplateColumns: gridCols,
                gap: 12,
                padding: "9px 16px",
                borderBottom: "1px solid var(--line)",
                background: ri % 2 ? "var(--panel2)" : undefined,
              }}
            >
              <span className="text-[11.5px] text-ink2">{r.label}</span>
              {r.cells.map((c, ci) => (
                <span
                  key={ci}
                  className="mono"
                  style={{
                    fontSize: "11.5px",
                    color: c.best ? "var(--acc)" : "var(--ink)",
                    fontWeight: c.best ? 700 : undefined,
                  }}
                >
                  {c.v}
                  {c.best && " ▪ BEST"}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Copilot analysis */}
      {hasEnough && summary && (
        <div className="panel mt-4 border-l-2 border-l-acc p-5">
          <div className="mb-2.5 flex items-center gap-2.5">
            <span className="lbl acc">Copilot analysis</span>
          </div>
          <p className="max-w-[76ch] text-[13.5px] leading-[1.65] text-ink2">
            {summary}
          </p>
        </div>
      )}

      {/* Empty state (< 2 parts) */}
      {!hasEnough && items.length === 0 && (
        <div className="panel px-10 py-9 text-center">
          <div className="mono mb-1.5 text-[12px] text-ink3">
            PICK AT LEAST TWO PARTS TO COMPARE
          </div>
          <p className="mb-4 text-[12px] text-ink2">
            Add them from part detail pages using the Compare button, or pick
            from the suggestions below.
          </p>
          <div className="mb-4 flex flex-wrap justify-center gap-2">
            {DEMO_PARTS.slice(0, 4).map((dp) => (
              <button
                key={dp.mpn}
                className="sug"
                onClick={() =>
                  toggle({ provider: "demo", part_id: dp.mpn, mpn: dp.mpn })
                }
              >
                <span className="mono">＋ {dp.mpn}</span> · {dp.desc}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Partial state (1 part loaded) */}
      {!hasEnough && items.length > 0 && (
        <div className="panel px-10 py-9 text-center">
          <div className="mono mb-1.5 text-[12px] text-ink3">
            ADD ANOTHER PART TO COMPARE
          </div>
          <p className="text-[12px] text-ink2">
            You need at least two parts to see a side-by-side comparison.
          </p>
        </div>
      )}
    </div>
  );
}
