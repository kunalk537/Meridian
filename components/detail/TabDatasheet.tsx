"use client";

import { Panel, Lbl, Button } from "@/components/meridian";
import type { ComponentDetails } from "@/lib/domain/models";

interface TabDatasheetProps {
  details: ComponentDetails;
}

export function TabDatasheet({ details }: TabDatasheetProps) {
  const url = details.datasheet_url;

  return (
    <Panel>
      <div className="flex items-center justify-between px-[18px] py-3 border-b border-line">
        <span className="mono text-[11.5px] text-ink2">
          {details.mpn}.pdf · via {details.manufacturer}
        </span>
        {url ? (
          <Button size="sm" onClick={() => window.open(url, "_blank")}>
            Open PDF
          </Button>
        ) : (
          <span className="text-[10px] text-ink3">No datasheet</span>
        )}
      </div>
      <div className="bgrid p-9 flex flex-col items-center gap-3.5">
        {/* Faux PDF preview */}
        <div className="w-full max-w-[400px] bg-field border border-line2 p-7">
          <div className="h-[11px] w-[55%] bg-line2" />
          <div className="h-[7px] w-[35%] bg-line mt-2" />
          <div className="h-px bg-line2 my-[18px]" />
          <div className="h-1.5 w-full bg-line mb-[7px]" />
          <div className="h-1.5 w-[92%] bg-line mb-[7px]" />
          <div className="h-1.5 w-[96%] bg-line mb-[7px]" />
          <div className="h-1.5 w-[70%] bg-line" />
        </div>
        <Lbl>Fetched live · not stored</Lbl>
      </div>
    </Panel>
  );
}
