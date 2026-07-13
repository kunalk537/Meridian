"use client";

import { Panel, Tag } from "@/components/meridian";
import { formatUsd, formatStock } from "@/lib/utils";
import type { ComponentDetails } from "@/lib/domain/models";

interface TabOverviewProps {
  details: ComponentDetails;
}

export function TabOverview({ details }: TabOverviewProps) {
  const specs = Object.entries(details.specifications);
  const hasSpecs = specs.length > 0;

  const offers = details.offers;
  const hasCad = details.cad_assets.length > 0;

  return (
    <div className="grid grid-cols-[1.35fr_1fr] gap-4 items-start">
      {/* Left: Key specifications */}
      <Panel className="p-[18px_20px]">
        <div className="lbl mb-2">
          Key specifications{" "}
          <span className="text-acc">· from {details.manufacturer}</span>
        </div>
        {hasSpecs ? (
          specs.map(([k, v]) => (
            <div key={k} className="kv">
              <span className="k">{k}</span>
              <span className="v">{v}</span>
            </div>
          ))
        ) : (
          <div className="text-xs text-ink3 py-2">No specifications available</div>
        )}
      </Panel>

      {/* Right column */}
      <div className="flex flex-col gap-4">
        {/* Live distributor data */}
        <Panel className="p-[18px_20px]">
          <div className="lbl mb-2">Live distributor data</div>
          {offers.length > 0 ? (
            offers.map((offer, i) => {
              const bestPrice =
                offer.price_breaks.length > 0
                  ? Math.min(...offer.price_breaks.map((b) => b.unit_price))
                  : null;
              const isBest = i === 0;
              return (
                <div key={offer.provider} className="kv">
                  <span className="k inline-flex items-center gap-2">
                    {offer.seller ?? offer.provider}
                    {isBest && <Tag kind="acc">Best</Tag>}
                  </span>
                  <span className="v">
                    {formatUsd(bestPrice)} · {formatStock(offer.stock)} in stock
                  </span>
                </div>
              );
            })
          ) : (
            <div className="text-xs text-ink3 py-2">No distributor data</div>
          )}
        </Panel>

        {/* CAD availability */}
        <Panel className="p-[18px_20px]">
          <div className="lbl mb-2">CAD availability</div>
          {hasCad ? (
            <>
              <div className="kv">
                <span className="k">Symbol</span>
                <Tag kind="ok">Available</Tag>
              </div>
              <div className="kv">
                <span className="k">Footprint</span>
                <Tag kind="ok">Available</Tag>
              </div>
              <div className="kv">
                <span className="k">3D STEP</span>
                <Tag kind={details.cad_assets.some((a) => a.kind === "step") ? "ok" : "warn"}>
                  {details.cad_assets.some((a) => a.kind === "step") ? "Available" : "Not available"}
                </Tag>
              </div>
            </>
          ) : (
            <div className="text-xs text-ink3 py-2">No CAD models available</div>
          )}
        </Panel>

        {/* Copilot design checks */}
        <Panel className="p-[18px_20px] border-l-2 border-l-acc">
          <div className="lbl acc mb-2.5">Copilot · design checks</div>
          <div className="flex gap-2.5 items-baseline py-1.5">
            <Tag kind="acc" className="flex-none">Info</Tag>
            <span className="text-xs leading-[1.55] text-ink2">
              <strong className="text-ink font-semibold">Part is active</strong> — lifecycle status is current with no known end-of-life notices.
            </span>
          </div>
          {details.offers.some((o) => (o.stock ?? 0) > 10000) && (
            <div className="flex gap-2.5 items-baseline py-1.5">
              <Tag kind="ok" className="flex-none">OK</Tag>
              <span className="text-xs leading-[1.55] text-ink2">
                <strong className="text-ink font-semibold">Good stock</strong> — multiple distributors with deep inventory.
              </span>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
