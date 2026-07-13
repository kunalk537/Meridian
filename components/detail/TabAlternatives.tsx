"use client";

import { Panel, Tag } from "@/components/meridian";
import { formatUsd } from "@/lib/utils";
import type { ComponentDetails } from "@/lib/domain/models";

interface TabAlternativesProps {
  details: ComponentDetails;
  alternatives?: { mpn: string; manufacturer: string; description: string; match: number; price: number | null }[];
}

export function TabAlternatives({ details, alternatives = [] }: TabAlternativesProps) {
  if (alternatives.length === 0) {
    return (
      <Panel className="p-12 text-center">
        <div className="mono text-xs text-ink3">
          No alternatives found — try searching for similar parts in the category.
        </div>
      </Panel>
    );
  }

  return (
    <Panel>
      <div className="thead g-alt">
        <span className="thb">Part</span>
        <span className="thb">Match</span>
        <span className="thb">Best $</span>
        <span></span>
      </div>
      {alternatives.map((alt) => (
        <div key={alt.mpn} className="trow click g-alt cursor-pointer">
          <div className="min-w-0">
            <span className="mono text-[12.5px] font-semibold">{alt.mpn}</span>
            <span className="text-[11.5px] text-ink3">
              {" "}· {alt.manufacturer} · {alt.description}
            </span>
          </div>
          <span>
            <Tag kind="acc">{alt.match}%</Tag>
          </span>
          <span className="mono text-xs font-semibold">{formatUsd(alt.price)}</span>
          <div className="flex justify-end">
            <span className="chipb">Open →</span>
          </div>
        </div>
      ))}
    </Panel>
  );
}
