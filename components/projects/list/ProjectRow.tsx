"use client";

import Link from "next/link";
import { Tag, type TagKind } from "@/components/meridian";
import type { Project } from "@/lib/data/types";
import { formatUsd } from "@/lib/utils";

function statusTag(status: string): { kind: TagKind; label: string } {
  const s = status.toLowerCase();
  if (s === "active" || s === "in progress") return { kind: "ok", label: status };
  if (s === "planning" || s === "draft") return { kind: "acc", label: status };
  if (s === "on hold" || s === "paused") return { kind: "warn", label: status };
  if (s === "archived" || s === "done" || s === "completed") return { kind: "mut", label: status };
  return { kind: "mut", label: status || "—" };
}

export function ProjectRow({ project }: { project: Project }) {
  const { kind, label } = statusTag(project.status);
  const lines: number = 0;
  const coverage: number = 0;

  return (
    <Link href={`/projects/${project.id}`} className="trow click g-prj block">
      <span className="text-[13px] font-semibold">{project.name}</span>
      <span className="mono text-[11.5px] text-ink3">{project.rev || "—"}</span>
      <span>
        <Tag kind={kind}>{label}</Tag>
      </span>
      <span className="mono text-[11.5px]">{lines}</span>
      <span className="mono text-[11.5px] font-semibold">—</span>
      <span className="mono text-[11.5px]">
        — <span className="text-ink3">×{project.build_qty}</span>
      </span>
      <div className="flex items-center gap-2">
        <span className="inline-block h-[3px] w-[52px] flex-none overflow-hidden bg-line2">
          <span
            className="block h-full"
            style={{
              width: `${coverage}%`,
              background:
                coverage >= 80
                  ? "var(--ok)"
                  : coverage >= 40
                    ? "var(--acc)"
                    : "var(--warn)",
            }}
          />
        </span>
        <span className="mono text-[11px]">{coverage}%</span>
      </div>
    </Link>
  );
}
