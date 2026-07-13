"use client";

/**
 * STUB — upgraded by the "Compare" work unit into the full docked compare tray.
 * Mounted globally in app/(app)/layout.tsx and driven by useCompare(). Renders
 * nothing when the compare set is empty.
 */
import { useCompare } from "@/lib/hooks/useCompare";
import { useRouter } from "next/navigation";

export function CompareTray() {
  const { items, clear } = useCompare();
  const router = useRouter();
  if (items.length === 0) return null;

  return (
    <div className="panel fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 px-4 py-2 animate-fadeUp">
      <span className="lbl">Compare {items.length}/3</span>
      <span className="mono text-[11px] text-ink2">
        {items.map((i) => i.mpn).join(" · ")}
      </span>
      <button className="btn sm pri" onClick={() => router.push("/compare")}>
        Compare
      </button>
      <button className="chipb" onClick={clear}>
        Clear
      </button>
    </div>
  );
}
