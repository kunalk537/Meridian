"use client";

/**
 * STUB — upgraded by the "Copilot bar" work unit into the full rule-based Q&A
 * bar (with preset chips, inline bubbles, and docs/copilot-upgrade.md). Kept as
 * a shared slot so the Results / Detail / Compare units can mount it now.
 */
import { Panel, Lbl } from "@/components/meridian";

export interface CopilotContext {
  /** Where the bar is mounted, so answers can be context-aware. */
  surface: "results" | "detail" | "compare";
  /** Free-form context the surface passes in (query, part, comparison, ...). */
  data?: unknown;
}

export function CopilotBar({ surface }: CopilotContext) {
  return (
    <Panel className="border-l-2 border-l-acc p-4">
      <Lbl accent>Copilot</Lbl>
      <p className="sub mt-1">
        Ask about price, stock, alternatives, or CAD. The {surface} copilot is wired up
        by the Copilot work unit.
      </p>
    </Panel>
  );
}
