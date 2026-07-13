"use client";

import { useRouter } from "next/navigation";
import { cn, formatUsd, formatStock } from "@/lib/utils";
import { useCompare } from "@/lib/hooks/useCompare";
import type { ComponentResult } from "@/lib/domain/models";

interface ResultsCardsProps {
  results: ComponentResult[];
  bestMpns: string[];
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

export function ResultsCards({ results, bestMpns }: ResultsCardsProps) {
  const router = useRouter();
  const { has, toggle } = useCompare();

  return (
    <div className="flex flex-col gap-2.5">
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
              "rescard cursor-pointer",
              isBest && "best",
            )}
            onClick={() => router.push(`/parts/${provider}/${encodeURIComponent(partId)}`)}
          >
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="mono text-[15px] font-semibold">{r.mpn}</span>
                <span className="mono text-[11px] text-ink3">{r.manufacturer}</span>
                {isBest && <span className="tag acc">Best match</span>}
              </div>
              <div className="mt-1.5 text-[12.5px] leading-relaxed text-ink2 max-w-[70ch]">
                {r.description}
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {stock > 0 && <span className="tag ok">In stock</span>}
                {stock === 0 && <span className="tag bad">Out of stock</span>}
                {r.category && (
                  <span className="tag mut">{r.category}</span>
                )}
                {r.offers.map((o) => (
                  <span key={o.provider} className="tag mut">
                    {o.provider}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex-none text-right flex flex-col items-end gap-2.5">
              <div>
                <div className="mono text-[17px] font-semibold">
                  {formatUsd(price)}
                </div>
                <div className="mono text-[10px] text-ink3 mt-0.5">
                  {formatStock(stock)} in stock
                </div>
              </div>
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
          </div>
        );
      })}
    </div>
  );
}
