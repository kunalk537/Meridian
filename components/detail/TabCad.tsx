"use client";

import { Panel, Tag } from "@/components/meridian";
import { api } from "@/lib/api-client";
import type { ComponentDetails } from "@/lib/domain/models";

interface TabCadProps {
  details: ComponentDetails;
  provider: string;
}

const KIND_ICONS: Record<string, string> = {
  symbol: "◆",
  footprint: "▢",
  step: "▣",
  library: "◫",
};

export function TabCad({ details, provider }: TabCadProps) {
  const assets = details.cad_assets;

  if (assets.length === 0) {
    return (
      <Panel className="p-12 text-center">
        <div className="mono text-xs text-ink3">No CAD assets available for this part</div>
      </Panel>
    );
  }

  // Deduplicate by filename
  const seen = new Set<string>();
  const unique = assets.filter((a) => {
    if (seen.has(a.filename)) return false;
    seen.add(a.filename);
    return true;
  });

  return (
    <>
      <Panel>
        {unique.map((asset, i) => (
          <div
            key={asset.filename}
            className="trow g-dl"
            style={{ borderBottom: i === unique.length - 1 ? "none" : undefined }}
          >
            <span className="text-ink3 text-sm">
              {KIND_ICONS[asset.kind] ?? "●"}
            </span>
            <span className="text-[13px] font-medium">{asset.filename}</span>
            <Tag kind={asset.format === "universal" ? "acc" : "mut"}>
              {asset.kind}
            </Tag>
            <div className="flex justify-end">
              <a
                href={asset.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn sm"
              >
                Download
              </a>
            </div>
          </div>
        ))}
      </Panel>
      <p className="mono text-[10.5px] text-ink3 mt-3 px-0.5 leading-[1.7]">
        Models are pulled from the CAD library that has them and handed straight to your tool — originals are never stored.
      </p>
    </>
  );
}
