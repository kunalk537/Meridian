"use client";

/**
 * Docked compare tray — floating bottom bar showing selected parts as chips
 * with remove buttons, a Compare button, and Clear. Mounted globally in
 * app/(app)/layout.tsx. Renders nothing when the compare set is empty.
 */
import { useCompare } from "@/lib/hooks/useCompare";
import { useRouter } from "next/navigation";

export function CompareTray() {
  const { items, remove, clear } = useCompare();
  const router = useRouter();
  if (items.length === 0) return null;

  const ready = items.length >= 2;

  return (
    <div className="panel fu fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 px-4 py-2.5 shadow-[0_16px_40px_-16px_rgba(0,0,0,.5)]">
      <span className="lbl">Compare</span>

      <div className="flex gap-1.5">
        {items.map((item) => (
          <span key={item.part_id} className="chip">
            {item.mpn}
            <button className="chipb" onClick={() => remove(item.part_id)}>
              ✕
            </button>
          </span>
        ))}
      </div>

      <button
        className={`btn sm ${ready ? "pri" : "dis"}`}
        disabled={!ready}
        onClick={() => router.push("/compare")}
      >
        Compare {items.length} →
      </button>

      <button className="chipb" onClick={clear}>
        Clear
      </button>
    </div>
  );
}
