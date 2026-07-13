"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useModals } from "@/lib/hooks/useModals";
import { Panel, CornerTicks, BlueprintGrid, Lbl, Button } from "@/components/meridian";

const SUGGESTIONS = [
  "24V→5V regulator, 3A",
  "ESP32 with BLE + USB-C",
  "Low-noise amp ~5V",
];

export function SearchHero() {
  const router = useRouter();
  const { open } = useModals();
  const [query, setQuery] = useState("");

  const { data: providersData } = useQuery({
    queryKey: ["providers"],
    queryFn: () => api.providers(),
    staleTime: 60_000,
  });

  const configuredCount =
    providersData?.providers?.filter((p) => p.configured).length ?? 0;

  const submit = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push("/results?q=" + encodeURIComponent(trimmed));
  }, [query, router]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") submit();
    },
    [submit],
  );

  return (
    <Panel corners className="bgrid relative p-[30px_34px_26px]">
      <div className="mb-4 flex items-center justify-between gap-3.5">
        <Lbl accent className="inline-flex items-center gap-2">
          <span className="inline-block h-px w-[22px] bg-current" />
          Meridian
        </Lbl>
        <button
          className="chipb inline-flex items-center gap-[7px] px-2.5 py-[5px]"
          onClick={() => open("sources")}
        >
          <span className="dot bg-ok" />
          {configuredCount} sources live · configure
        </button>
      </div>

      <h1 className="h1 mb-2 max-w-[34ch] text-[clamp(21px,2.4vw,27px)] leading-[1.25] tracking-[-0.015em]">
        AI copilot for sourcing and managing your electronic components
        <span className="text-acc">.</span>
      </h1>

      <p className="sub mb-[18px] max-w-[76ch]">
        Type what you need below — plain English, an exact part number, or spec
        limits. Meridian searches your distributors, manufacturers and CAD
        libraries at once, then returns a single table you can sort, compare,
        and add to a project BOM.
      </p>

      <div className="flex items-stretch gap-2">
        <input
          className="inp flex-1 py-3 text-sm"
          placeholder="e.g. buck regulator, 24 V in, 5 V out, 3 A, in stock"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button variant="pri" className="flex-none px-6" onClick={submit}>
          Search
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="lbl">Try ▸</span>
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            className="sug"
            onClick={() => {
              setQuery(s);
            }}
          >
            {s}
          </button>
        ))}
        <div className="flex-1" />
        <span className="mono text-[10px] text-ink3">
          accepts natural language · exact MPN · spec constraints
        </span>
      </div>
    </Panel>
  );
}
