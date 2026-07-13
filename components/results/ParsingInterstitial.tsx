"use client";

import { useEffect, useState } from "react";
import { Lbl, Chip, Panel } from "@/components/meridian";
import { cn } from "@/lib/utils";

interface ParsedConstraint {
  k: string;
  v: string;
}

interface ProviderPing {
  name: string;
  status: "querying" | "ok";
  ms: string;
}

interface ParsingInterstitialProps {
  query: string;
  constraints: ParsedConstraint[];
  providers: string[];
  onDone: () => void;
}

const CONSTRAINT_REVEAL_MS = 180;
const PROVIDER_STAGGER_MS = 300;
const FINAL_DELAY_MS = 600;

export function ParsingInterstitial({
  query,
  constraints,
  providers,
  onDone,
}: ParsingInterstitialProps) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [showPinging, setShowPinging] = useState(false);
  const [pings, setPings] = useState<ProviderPing[]>([]);
  const [filtersDone, setFiltersDone] = useState(false);

  useEffect(() => {
    if (visibleCount < constraints.length) {
      const t = setTimeout(
        () => setVisibleCount((c) => c + 1),
        CONSTRAINT_REVEAL_MS,
      );
      return () => clearTimeout(t);
    }
    if (!filtersDone) {
      const t = setTimeout(() => {
        setFiltersDone(true);
        setShowPinging(true);
      }, 250);
      return () => clearTimeout(t);
    }
  }, [visibleCount, constraints.length, filtersDone]);

  useEffect(() => {
    if (!showPinging) return;
    providers.forEach((name, i) => {
      const delay = i * PROVIDER_STAGGER_MS;
      setTimeout(() => {
        setPings((prev) => [...prev, { name, status: "querying", ms: "" }]);
      }, delay);
      setTimeout(
        () => {
          setPings((prev) =>
            prev.map((p) =>
              p.name === name
                ? { ...p, status: "ok", ms: `${120 + Math.floor(Math.random() * 380)}ms` }
                : p,
            ),
          );
        },
        delay + 200 + Math.floor(Math.random() * 400),
      );
    });
  }, [showPinging, providers]);

  useEffect(() => {
    if (
      showPinging &&
      pings.length > 0 &&
      pings.every((p) => p.status === "ok")
    ) {
      const t = setTimeout(onDone, FINAL_DELAY_MS);
      return () => clearTimeout(t);
    }
  }, [showPinging, pings, onDone]);

  return (
    <div className="mx-auto max-w-[760px] px-8 py-14">
      <Lbl accent>
        <span className="mr-2 inline-block w-[22px] align-middle" style={{ height: 1 }} />
        Parsing request
      </Lbl>

      <div className="mt-5 mb-7 flex items-start gap-3.5">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--acc)"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mt-1 flex-none animate-spin"
          style={{ animationDuration: "1.2s" }}
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        <div className="mono text-[17px] font-medium leading-snug">&ldquo;{query}&rdquo;</div>
      </div>

      <Panel className="p-5">
        <Lbl className="mb-3">Extracted constraints</Lbl>
        <div className="flex flex-wrap gap-2">
          {constraints.slice(0, visibleCount).map((f, i) => (
            <Chip key={i} className="animate-fadeUp px-2.5 py-1.5 text-[11px]">
              <span className="text-[8.5px] font-medium uppercase tracking-[0.14em] text-acc">
                {f.k}
              </span>{" "}
              {f.v}
            </Chip>
          ))}
          {!filtersDone && (
            <span
              className="inline-block h-[18px] w-2 self-center bg-acc"
              style={{ animation: "blink 1s steps(2) infinite" }}
            />
          )}
        </div>
      </Panel>

      {showPinging && (
        <Panel className="mt-3.5 p-5 animate-fadeUp">
          <Lbl className="mb-3">Provider query log · {providers.length} enabled</Lbl>
          <div className="flex flex-col">
            {pings.map((pr) => (
              <div
                key={pr.name}
                className="mono flex items-center gap-3 border-b border-dashed border-line py-1.5 text-[11.5px] animate-fadeUp"
              >
                <span
                  className={cn(
                    "dot flex-none",
                    pr.status === "querying"
                      ? "bg-warn animate-pulse"
                      : "bg-ok",
                  )}
                />
                <span className="flex-1">{pr.name}</span>
                <span className="text-ink3">{pr.ms}</span>
                <span
                  className={
                    pr.status === "querying" ? "text-warn" : "text-ink"
                  }
                >
                  {pr.status === "querying" ? "[QUERYING]" : "[OK]"}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
