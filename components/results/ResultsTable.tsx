"use client";

import { useRouter } from "next/navigation";
import { cn, formatUsd, formatStock } from "@/lib/utils";
import { useCompare } from "@/lib/hooks/useCompare";
import type { ComponentResult } from "@/lib/domain/models";

type SortKey = "mpn" | "price" | "stock" | "match";
type Dataset = "reg" | "esp" | "opamp";

const SPEC_COLS: Record<Dataset, { key: string; label: string }[]> = {
  reg: [
    { key: "VIN", label: "VIN" },
    { key: "EFF", label: "EFF" },
    { key: "FSW", label: "FSW" },
    { key: "IQ", label: "IQ" },
    { key: "PKG", label: "PKG" },
  ],
  esp: [
    { key: "CORE", label: "CORE" },
    { key: "RADIO", label: "RADIO" },
    { key: "USB", label: "USB" },
    { key: "FLASH", label: "FLASH" },
    { key: "GPIO", label: "GPIO" },
  ],
  opamp: [
    { key: "NOISE", label: "NOISE" },
    { key: "OFFSET", label: "OFFSET" },
    { key: "SUPPLY", label: "SUPPLY" },
    { key: "GBW", label: "GBW" },
    { key: "IQ", label: "IQ" },
  ],
};

export interface ResultsTableProps {
  results: ComponentResult[];
  sortKey: SortKey;
  sortDir: 1 | -1;
  onSort: (key: SortKey) => void;
  bestMpns: string[];
  dataset: Dataset;
}

const ARROW = (key: SortKey, active: SortKey, dir: 1 | -1) =>
  active === key ? (dir === 1 ? " ↑" : " ↓") : "";

function bestPrice(r: ComponentResult): number | null {
  const prices = r.offers
    .flatMap((o) => o.price_breaks.map((b) => b.unit_price))
    .filter((p) => p > 0);
  return prices.length ? Math.min(...prices) : null;
}

function totalStock(r: ComponentResult): number {
  return r.offers.reduce((sum, o) => sum + (o.stock ?? 0), 0);
}

export function ResultsTable({
  results,
  sortKey,
  sortDir,
  onSort,
  bestMpns,
  dataset,
}: ResultsTableProps) {
  const router = useRouter();
  const { has, toggle } = useCompare();
  const cols = SPEC_COLS[dataset];

  return (
    <div className="panel overflow-x-auto">
      <div className="min-w-[860px]">
        <div className="thead g-res">
          <button className={cn("thb", sortKey === "mpn" && "on")} onClick={() => onSort("mpn")}>
            Component{ARROW("mpn", sortKey, sortDir)}
          </button>
          {cols.map((c) => (
            <span key={c.key} className="thb">{c.label}</span>
          ))}
          <button
            className={cn("thb", sortKey === "price" && "on")}
            onClick={() => onSort("price")}
          >
            Best ${ARROW("price", sortKey, sortDir)}
          </button>
          <button
            className={cn("thb", sortKey === "stock" && "on")}
            onClick={() => onSort("stock")}
          >
            Stock{ARROW("stock", sortKey, sortDir)}
          </button>
          <span className="thb">+CMP</span>
        </div>
        {results.map((r) => {
          const isBest = bestMpns.includes(r.mpn);
          const price = bestPrice(r);
          const stock = totalStock(r);
          const partId = r.offers[0]?.part_id ?? r.mpn;
          const provider = r.offers[0]?.provider ?? "unknown";
          return (
            <div
              key={r.mpn}
              className={cn(
                "trow click g-res cursor-pointer",
                isBest && "best",
              )}
              onClick={() => router.push(`/parts/${provider}/${encodeURIComponent(partId)}`)}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mono text-[13px] font-semibold">{r.mpn}</span>
                  {isBest && <span className="tag acc">Best match</span>}
                </div>
                <div className="mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-ink3">
                  {r.manufacturer ?? "—"} · {r.description?.slice(0, 60) ?? ""}
                </div>
              </div>
              {cols.map((c) => (
                <span key={c.key} className="mono text-[11.5px]">—</span>
              ))}
              <span className="mono text-[12.5px] font-semibold">
                {formatUsd(price)}
              </span>
              <span>
                <span
                  className={cn(
                    "mono text-[11px]",
                    stock === 0
                      ? "text-bad"
                      : stock < 10000
                        ? "text-warn"
                        : "text-ink",
                  )}
                >
                  {formatStock(stock)}
                </span>
              </span>
              <button
                className={cn(
                  "btn sm",
                  has(r.mpn) ? "on" : "",
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  toggle({
                    provider,
                    part_id: partId,
                    mpn: r.mpn,
                  });
                }}
              >
                {has(r.mpn) ? "✓" : "+CMP"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
