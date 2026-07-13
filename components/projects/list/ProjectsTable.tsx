"use client";

import type { Project } from "@/lib/data/types";
import { Panel } from "@/components/meridian";
import { ProjectRow } from "./ProjectRow";

const columns = [
  "Project",
  "Rev",
  "Status",
  "Lines",
  "Unit cost",
  "Build cost",
  "Sourcing",
] as const;

export function ProjectsTable({ projects }: { projects: Project[] }) {
  return (
    <Panel className="overflow-x-auto">
      <div className="min-w-[860px]">
        <div className="thead g-prj">
          {columns.map((col) => (
            <span key={col} className="thb">
              {col}
            </span>
          ))}
        </div>
        {projects.map((p) => (
          <ProjectRow key={p.id} project={p} />
        ))}
      </div>
    </Panel>
  );
}
