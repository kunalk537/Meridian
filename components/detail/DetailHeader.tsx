"use client";

import * as React from "react";
import { Panel, CornerTicks, Tag, Button } from "@/components/meridian";
import { cn, formatUsd, formatStock } from "@/lib/utils";
import { useCompare } from "@/lib/hooks/useCompare";
import { useSavedParts, useProjects, useBom } from "@/lib/hooks/data";
import { useToast } from "@/lib/hooks/useToast";
import { api } from "@/lib/api-client";
import type { ComponentDetails } from "@/lib/domain/models";

const EDA_TARGETS = ["KiCad", "Altium", "EasyEDA", "Fusion 360"] as const;

function bestPrice(details: ComponentDetails): number | null {
  for (const offer of details.offers) {
    if (offer.price_breaks.length > 0) {
      const prices = offer.price_breaks.map((b) => b.unit_price);
      const min = Math.min(...prices);
      return min;
    }
  }
  return null;
}

function totalStock(details: ComponentDetails): number {
  return details.offers.reduce((sum, o) => sum + (o.stock ?? 0), 0);
}

export function DetailHeader({ details }: { details: ComponentDetails }) {
  const { toast } = useToast();
  const { has: hasCompare, toggle: toggleCompare } = useCompare();
  const savedParts = useSavedParts();
  const projects = useProjects();

  const [importOpen, setImportOpen] = React.useState(false);
  const [bomOpen, setBomOpen] = React.useState(false);
  const importRef = React.useRef<HTMLDivElement>(null);
  const bomRef = React.useRef<HTMLDivElement>(null);

  const isCompared = hasCompare(details.mpn);
  const isSaved = savedParts.data?.some(
    (s) => s.provider === details.offers[0]?.provider && s.part_id === details.mpn,
  );

  // Close dropdowns on outside click
  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (importRef.current && !importRef.current.contains(e.target as Node)) {
        setImportOpen(false);
      }
      if (bomRef.current && !bomRef.current.contains(e.target as Node)) {
        setBomOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const price = bestPrice(details);
  const stock = totalStock(details);
  const sourceCount = details.offers.length;

  function handleImport(target: string) {
    const provider = details.offers[0]?.provider ?? "demo";
    const url = api.exportLink(provider, details.mpn);
    window.open(url, "_blank");
    setImportOpen(false);
    toast(`Opening ${target} export…`, "ok");
  }

  function handleAddToBom(projectId: string) {
    const provider = details.offers[0]?.provider ?? "demo";
    const bom = useBom(projectId);
    bom.add.mutate(
      {
        mpn: details.mpn,
        provider,
        part_id: details.mpn,
        description: details.description ?? "",
      },
      {
        onSuccess: () => {
          toast("Added to BOM", "ok");
          setBomOpen(false);
        },
        onError: (err: Error) => toast(err.message, "bad"),
      },
    );
  }

  function handleCompare() {
    const provider = details.offers[0]?.provider ?? "demo";
    toggleCompare({ provider, part_id: details.mpn, mpn: details.mpn });
    toast(isCompared ? "Removed from compare" : "Added to compare", "ok");
  }

  function handleSave() {
    const provider = details.offers[0]?.provider ?? "demo";
    savedParts.save.mutate(
      {
        provider,
        part_id: details.mpn,
        mpn: details.mpn,
        description: details.description ?? "",
      },
      {
        onSuccess: () => toast("Part saved", "ok"),
        onError: (err: Error) => toast(err.message, "bad"),
      },
    );
  }

  return (
    <Panel corners className="relative p-6">
      <div className="flex gap-[22px] items-start">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="mono text-[26px] font-bold tracking-[0.01em] m-0">
              {details.mpn}
            </h1>
            <span className="mono text-xs text-ink3">{details.manufacturer}</span>
            {details.lifecycle_status && (
              <Tag kind={details.lifecycle_status.toLowerCase() === "active" ? "ok" : "warn"}>
                {details.lifecycle_status}
              </Tag>
            )}
          </div>
          {details.description && (
            <p className="text-[13.5px] text-ink2 mt-2.5 leading-[1.6] max-w-[70ch]">
              {details.description}
            </p>
          )}
        </div>
        <div className="flex-none text-right">
          <div className="mono text-2xl font-bold">{formatUsd(price)}</div>
          <div className="mono text-[10px] text-ink3 mt-0.5">
            {formatStock(stock)} in stock · {sourceCount} source{sourceCount !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-5 relative flex-wrap">
        {/* Import to EDA dropdown */}
        <div className="relative" ref={importRef}>
          <Button variant="pri" onClick={() => setImportOpen(!importOpen)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <path d="M7 10l5 5 5-5" />
              <path d="M12 15V3" />
            </svg>
            Import to EDA ▾
          </Button>
          {importOpen && (
            <div className="panel fu absolute top-10 left-0 z-15 w-[200px] p-1 border-line2">
              {EDA_TARGETS.map((t) => (
                <button
                  key={t}
                  className="nv border-l-none text-[12.5px]"
                  onClick={() => handleImport(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Add to BOM dropdown */}
        <div className="relative" ref={bomRef}>
          <Button onClick={() => setBomOpen(!bomOpen)}>＋ Add to BOM ▾</Button>
          {bomOpen && (
            <div className="panel fu absolute top-10 left-0 z-15 w-[240px] p-1 border-line2">
              {projects.data && projects.data.length > 0 ? (
                projects.data.map((p) => (
                  <button
                    key={p.id}
                    className="nv border-l-none text-[12.5px]"
                    onClick={() => handleAddToBom(p.id)}
                  >
                    <span className="flex-1">{p.name}</span>
                    <span className="lbl text-[8.5px]">project</span>
                  </button>
                ))
              ) : (
                <div className="p-3 text-xs text-ink3">No projects yet</div>
              )}
            </div>
          )}
        </div>

        <Button
          variant={isCompared ? "on" : "default"}
          onClick={handleCompare}
        >
          {isCompared ? "✓ Comparing" : "Compare"}
        </Button>

        <Button
          variant={isSaved ? "on" : "default"}
          onClick={handleSave}
        >
          {isSaved ? "✓ Saved" : "Save"}
        </Button>
      </div>
    </Panel>
  );
}
