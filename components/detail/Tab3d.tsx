"use client";

import { Panel, CornerTicks, Tag } from "@/components/meridian";
import type { ComponentDetails } from "@/lib/domain/models";

interface Tab3dProps {
  details: ComponentDetails;
}

export function Tab3d({ details }: Tab3dProps) {
  const stepAsset = details.cad_assets.find(
    (a) => a.kind === "step" || a.filename.endsWith(".step"),
  );

  return (
    <Panel corners className="bgrid relative h-[340px] flex items-center justify-center">
      <div className="text-center">
        {/* Faux 3D package render */}
        <div
          className="w-[110px] h-[80px] mx-auto bg-panel2 border border-line2"
          style={{
            transform: "perspective(480px) rotateX(52deg) rotateZ(-28deg)",
            boxShadow: "0 30px 40px -20px rgba(0,0,0,.45)",
          }}
        />
        <div className="mono text-[11px] text-ink3 mt-9">
          STEP MODEL · {details.package ?? "unknown"} · DRAG TO ROTATE
        </div>
        {stepAsset ? (
          <div className="mono text-[10px] text-acc mt-1.5">
            SOURCE · {stepAsset.format}
          </div>
        ) : (
          <div className="mono text-[10px] text-warn mt-1.5">
            STEP NOT AVAILABLE FROM SELECTED LIBRARIES
          </div>
        )}
      </div>
    </Panel>
  );
}
