"use client";

import * as React from "react";
import { Seg } from "@/components/meridian";
import { CopilotBar } from "@/components/copilot/CopilotBar";
import { DetailHeader } from "./DetailHeader";
import { TabOverview } from "./TabOverview";
import { TabPricing } from "./TabPricing";
import { TabDatasheet } from "./TabDatasheet";
import { TabCad } from "./TabCad";
import { TabPinout } from "./TabPinout";
import { Tab3d } from "./Tab3d";
import { TabAlternatives } from "./TabAlternatives";
import type { ComponentDetails } from "@/lib/domain/models";

type TabId = "overview" | "pricing" | "datasheet" | "cad" | "pinout" | "3d" | "alternatives";

const TABS: { value: TabId; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "pricing", label: "Pricing" },
  { value: "datasheet", label: "Datasheet" },
  { value: "cad", label: "CAD & downloads" },
  { value: "pinout", label: "Pinout" },
  { value: "3d", label: "3D model" },
  { value: "alternatives", label: "Alternatives" },
];

interface DetailClientProps {
  details: ComponentDetails;
  provider: string;
  alternatives?: { mpn: string; manufacturer: string; description: string; match: number; price: number | null }[];
}

export function DetailClient({ details, provider, alternatives }: DetailClientProps) {
  const [tab, setTab] = React.useState<TabId>("overview");

  return (
    <div className="mx-auto max-w-[1040px] px-8 py-6 pb-[130px]">
      {/* Back link */}
      <a href="/search" className="chipb inline-block mb-4">
        ← Back to results
      </a>

      {/* Header */}
      <DetailHeader details={details} />

      {/* Copilot bar */}
      <div className="mt-4">
        <CopilotBar surface="detail" data={details} />
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 mt-[22px] border-b border-line2 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.value}
            className={`segbtn ${tab === t.value ? "on" : ""}`}
            onClick={() => setTab(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="pt-5">
        {tab === "overview" && <TabOverview details={details} />}
        {tab === "pricing" && <TabPricing details={details} />}
        {tab === "datasheet" && <TabDatasheet details={details} />}
        {tab === "cad" && <TabCad details={details} provider={provider} />}
        {tab === "pinout" && <TabPinout details={details} />}
        {tab === "3d" && <Tab3d details={details} />}
        {tab === "alternatives" && (
          <TabAlternatives details={details} alternatives={alternatives} />
        )}
      </div>
    </div>
  );
}
