"use client";

import { useMemo } from "react";
import { Lbl, Button } from "@/components/meridian";
import { cn } from "@/lib/utils";
import type { ComponentResult } from "@/lib/domain/models";
import type { ProviderInfo } from "@/lib/api-client";
import { useModals } from "@/lib/hooks/useModals";

export interface FilterState {
  inStockOnly: boolean;
  maxPrice: string;
  minStock: string;
  mfrExcluded: Record<string, boolean>;
}

interface RightRailProps {
  results: ComponentResult[];
  filters: FilterState;
  onChange: (f: FilterState) => void;
  providers: ProviderInfo[];
  hiddenCount: number;
  onClearFilters: () => void;
}

export function RightRail({
  results,
  filters,
  onChange,
  providers,
  hiddenCount,
  onClearFilters,
}: RightRailProps) {
  const { open } = useModals();

  const mfrCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of results) {
      const m = r.manufacturer ?? "Unknown";
      map.set(m, (map.get(m) ?? 0) + 1);
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [results]);

  const activeProviders = providers.filter((p) => p.configured);

  return (
    <div className="flex flex-col gap-3.5 min-w-0">
      {/* Filters */}
      <div className="panel">
        <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
          <Lbl>Filters</Lbl>
          {(filters.inStockOnly ||
            filters.maxPrice ||
            filters.minStock ||
            Object.values(filters.mfrExcluded).some(Boolean)) && (
            <button className="chipb" onClick={onClearFilters}>
              Clear
            </button>
          )}
        </div>
        <div className="flex flex-col gap-3 p-3.5">
          <button
            className={cn(
              "flex items-center justify-between rounded-sm border border-line2 px-3 py-2 text-[12px] transition-colors hover:border-ink3",
              filters.inStockOnly && "border-accline bg-accsoft text-acc",
            )}
            onClick={() =>
              onChange({ ...filters, inStockOnly: !filters.inStockOnly })
            }
          >
            In stock only
            <span className="mono text-[11px]">{filters.inStockOnly ? "✕" : ""}</span>
          </button>

          <div>
            <Lbl className="mb-1.5">Max unit price ($)</Lbl>
            <input
              className="inp py-1.5 px-2.5 text-[12px]"
              value={filters.maxPrice}
              onChange={(e) => onChange({ ...filters, maxPrice: e.target.value })}
              placeholder="e.g. 2.00"
            />
          </div>

          <div>
            <Lbl className="mb-1.5">Min total stock</Lbl>
            <input
              className="inp py-1.5 px-2.5 text-[12px]"
              value={filters.minStock}
              onChange={(e) => onChange({ ...filters, minStock: e.target.value })}
              placeholder="e.g. 50000"
            />
          </div>

          <div>
            <Lbl className="mb-1.5">Manufacturer</Lbl>
            <div className="flex flex-col gap-1">
              {mfrCounts.map(({ name, count }) => {
                const excluded = !!filters.mfrExcluded[name];
                return (
                  <button
                    key={name}
                    className="flex w-full items-center gap-2 bg-transparent py-0.5 text-left text-[12px] text-ink2"
                    onClick={() =>
                      onChange({
                        ...filters,
                        mfrExcluded: { ...filters.mfrExcluded, [name]: !excluded },
                      })
                    }
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 flex-none items-center justify-center border border-line2",
                        excluded ? "border-ink3 bg-panel2" : "bg-acc border-acc",
                      )}
                    >
                      {!excluded && (
                        <svg
                          width="9"
                          height="9"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="var(--onacc)"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      )}
                    </span>
                    <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                      {name}
                    </span>
                    <span className="mono text-[9.5px] text-ink3">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Design checks */}
      <div className="panel border-l-2 border-l-acc">
        <div className="flex items-center gap-2 border-b border-line px-3.5 py-2.5">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--acc)"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3 13.9 8.6 19.5 10.5 13.9 12.4 12 18 10.1 12.4 4.5 10.5 10.1 8.6z" />
          </svg>
          <Lbl accent>Design checks</Lbl>
        </div>
        <div className="px-3.5 py-3">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="tag warn text-[9.5px]">warn</span>
            <span className="text-[12px] font-semibold">
              Spec-set detection varies
            </span>
          </div>
          <p className="text-[11.5px] leading-relaxed text-ink2">
            Columns adapt to the detected component category. Regulator, ESP, or
            op-amp specs are shown automatically from the result metadata.
          </p>
        </div>
      </div>

      {/* Sources */}
      <div className="panel">
        <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
          <Lbl>Sources · {activeProviders.length} live</Lbl>
          <button className="chipb" onClick={() => open("sources")}>
            Manage
          </button>
        </div>
        <div className="px-3.5 py-2.5">
          <span className="mono text-[10px] leading-relaxed text-ink3">
            {activeProviders.map((p) => p.display_name).join(" · ")}
          </span>
        </div>
      </div>

      {/* Hidden by filters notice */}
      {hiddenCount > 0 && (
        <div className="panel border-dashed px-3.5 py-2.5 text-[10.5px] font-medium text-ink3">
          <div className="flex items-center justify-between">
            <span className="mono">
              {hiddenCount} RESULT(S) HIDDEN BY YOUR FILTERS
            </span>
            <button className="chipb" onClick={onClearFilters}>
              Clear filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
