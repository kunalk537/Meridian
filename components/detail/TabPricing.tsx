"use client";

import { Panel, Tag } from "@/components/meridian";
import { formatUsd, formatStock } from "@/lib/utils";
import type { ComponentDetails } from "@/lib/domain/models";

interface TabPricingProps {
  details: ComponentDetails;
}

export function TabPricing({ details }: TabPricingProps) {
  const offers = details.offers;

  if (offers.length === 0) {
    return (
      <Panel className="p-12 text-center">
        <div className="mono text-xs text-ink3">No pricing data available</div>
      </Panel>
    );
  }

  // Find best (lowest) unit price across all offers for the "Best price" tag
  let bestPrice = Infinity;
  for (const offer of offers) {
    for (const pb of offer.price_breaks) {
      if (pb.unit_price < bestPrice) bestPrice = pb.unit_price;
    }
  }

  return (
    <div className="grid grid-cols-repeat(auto-fit,minmax(230px,1fr)) gap-3.5">
      {offers.map((offer) => {
        const lowestPrice =
          offer.price_breaks.length > 0
            ? Math.min(...offer.price_breaks.map((b) => b.unit_price))
            : null;
        const isBest = lowestPrice !== null && lowestPrice <= bestPrice;

        return (
          <Panel
            key={offer.provider}
            className={`p-[18px_20px] ${isBest ? "border-l-2 border-l-acc bg-accsoft" : ""}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold">{offer.seller ?? offer.provider}</span>
              {isBest && <Tag kind="acc">Best price</Tag>}
            </div>
            {offer.price_breaks.length > 0 ? (
              offer.price_breaks.map((pb) => (
                <div key={pb.quantity} className="kv">
                  <span className="k mono text-[11px]">{pb.quantity}+</span>
                  <span className="v">{formatUsd(pb.unit_price)}</span>
                </div>
              ))
            ) : (
              <div className="text-xs text-ink3 py-1">No price breaks</div>
            )}
            <div className="mono text-[10px] text-ink3 mt-3">
              {formatStock(offer.stock)} in stock
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
