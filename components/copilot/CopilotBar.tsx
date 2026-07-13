"use client";

/**
 * Copilot follow-up bar — rule-based Q&A with preset chips, inline chat
 * bubbles, and surface-aware context.  Mounted inside results / detail /
 * compare views.  No LLM; uses rules.ts for canned answers.
 */
import * as React from "react";
import { Panel, Lbl } from "@/components/meridian";
import { cn } from "@/lib/utils";
import { answerFor, PRESETS, PLACEHOLDER, type Surface } from "./rules";

export interface CopilotContext {
  /** Where the bar is mounted, so answers can be context-aware. */
  surface: "results" | "detail" | "compare";
  /** Free-form context the surface passes in (query, part, comparison, ...). */
  data?: unknown;
}

interface ChatMsg {
  role: "user" | "ai";
  text: string;
}

export function CopilotBar({ surface, data }: CopilotContext) {
  const [draft, setDraft] = React.useState("");
  const [chat, setChat] = React.useState<ChatMsg[]>([]);
  const [typing, setTyping] = React.useState(false);
  const threadRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  React.useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat, typing]);

  const ask = React.useCallback(
    (qText: string) => {
      const trimmed = qText.trim();
      if (!trimmed) return;
      const answer = answerFor(trimmed, surface, data);
      setChat((prev) => [...prev, { role: "user", text: trimmed }]);
      setTyping(true);
      setDraft("");
      // Simulate thinking delay (matches prototype's 700 ms)
      setTimeout(() => {
        setChat((prev) => [...prev, { role: "ai", text: answer }]);
        setTyping(false);
      }, 700);
    },
    [surface, data],
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      ask(draft);
    }
  }

  const presets = PRESETS[surface];
  const placeholder = PLACEHOLDER[surface];

  return (
    <Panel className="border-l-2 border-l-acc p-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-1">
        <Lbl accent>Copilot</Lbl>
      </div>

      {/* Input row */}
      <div className="flex items-stretch gap-2 px-3 pb-2">
        <input
          className="inp flex-1 py-2 text-xs"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
        />
        <button
          className="btn pri flex-none px-4"
          onClick={() => ask(draft)}
        >
          Ask
        </button>
      </div>

      {/* Preset chips */}
      <div className="flex flex-wrap gap-1.5 px-3 pb-3">
        {presets.map((q) => (
          <button
            key={q}
            className="sug text-[10.5px] px-2.5 py-1"
            onClick={() => ask(q)}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Chat thread */}
      {(chat.length > 0 || typing) && (
        <div
          ref={threadRef}
          className="flex flex-col gap-2.5 overflow-y-auto border-t border-line px-3 py-3"
          style={{ maxHeight: 300 }}
        >
          {chat.map((m, i) => (
            <div
              key={i}
              className={cn(
                "flex",
                m.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[88%] text-xs leading-relaxed px-3.5 py-2.5",
                  "rounded-sm",
                  m.role === "user"
                    ? "bg-acc text-onacc"
                    : "bg-panel2 border border-line text-ink",
                )}
              >
                {m.text}
              </div>
            </div>
          ))}
          {typing && (
            <div className="flex justify-start">
              <div className="mono bg-panel2 border border-line text-acc text-xs px-3 py-2 rounded-sm">
                ...
              </div>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
