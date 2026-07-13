"use client";

import { useRouter } from "next/navigation";
import { useSearchHistory, useSavedParts, useProjects } from "@/lib/hooks/data";
import { useModals } from "@/lib/hooks/useModals";
import { Panel, Lbl } from "@/components/meridian";

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function HomePanels() {
  const router = useRouter();
  const { open } = useModals();
  const { data: history = [] } = useSearchHistory();
  const { data: saved = [] } = useSavedParts();
  const { data: projects = [] } = useProjects();

  return (
    <div className="mt-3.5 grid grid-cols-[1.2fr_1fr_1fr] items-start gap-3.5">
      <Panel>
        <div className="border-b border-line px-3.5 py-2.5">
          <Lbl>Recent searches</Lbl>
        </div>
        {history.length === 0 ? (
          <div className="px-3.5 py-3">
            <span className="mono text-[9.5px] text-ink3">
              No recent searches yet.
            </span>
          </div>
        ) : (
          history.map((row) => (
            <button
              key={row.id}
              className="trow click grid w-full grid-cols-[1fr_48px] border-l-0 border-r-0 border-t-0 bg-transparent px-3.5 py-[9px] text-left"
              onClick={() =>
                router.push("/results?q=" + encodeURIComponent(row.query))
              }
            >
              <span className="truncate text-xs">{row.query}</span>
              <span className="mono text-right text-[9.5px] text-ink3">
                {timeAgo(row.created_at)}
              </span>
            </button>
          ))
        )}
      </Panel>

      <Panel>
        <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
          <Lbl>Saved parts</Lbl>
          <span className="mono text-[9.5px] text-ink3">{saved.length}</span>
        </div>
        {saved.length === 0 ? (
          <div className="px-3.5 py-3">
            <span className="mono text-[9.5px] text-ink3">
              Press SAVE on any part to bookmark it here.
            </span>
          </div>
        ) : (
          saved.map((part) => (
            <button
              key={part.id}
              className="trow click grid w-full grid-cols-[1fr_52px] border-l-0 border-r-0 border-t-0 bg-transparent px-3.5 py-[9px] text-left"
              onClick={() =>
                router.push(
                  `/parts/${part.provider}/${encodeURIComponent(part.part_id)}`,
                )
              }
            >
              <span className="truncate font-mono text-[11.5px] font-semibold">
                {part.mpn}
              </span>
              <span className="mono text-right text-[9.5px] text-ink3">—</span>
            </button>
          ))
        )}
      </Panel>

      <Panel>
        <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
          <Lbl>Your projects</Lbl>
          <button className="chipb" onClick={() => open("new-project")}>
            ＋ New
          </button>
        </div>
        {projects.length === 0 ? (
          <div className="px-3.5 py-3">
            <span className="mono text-[9.5px] text-ink3">
              Each project holds an editable BOM with datasheets and costs.
            </span>
          </div>
        ) : (
          projects.map((project) => (
            <button
              key={project.id}
              className="trow click grid w-full grid-cols-[1fr_60px] border-l-0 border-r-0 border-t-0 bg-transparent px-3.5 py-[9px] text-left"
              onClick={() => router.push(`/projects/${project.id}`)}
            >
              <span className="truncate text-xs font-medium">{project.name}</span>
              <span className="mono text-right text-[9.5px] text-ink3">
                {project.build_qty ? `${project.build_qty} pcs` : project.status}
              </span>
            </button>
          ))
        )}
      </Panel>
    </div>
  );
}
