"use client";

import { Button, Panel } from "@/components/meridian";
import { useProjects } from "@/lib/hooks/data";
import { useModals } from "@/lib/hooks/useModals";
import { ProjectsTable, EmptyState } from "@/components/projects/list";

export default function ProjectsPage() {
  const { data = [], isLoading } = useProjects();
  const { open } = useModals();

  return (
    <div className="mx-auto max-w-[1080px] px-8 pt-8 pb-24">
      <div className="flex items-start justify-between gap-5">
        <div>
          <h1 className="h1">Projects</h1>
          <p className="sub mb-[22px]">
            One workspace per board you&apos;re designing. Open a project to build its BOM
            line by line, check live sourcing for every part, pull each part&apos;s
            datasheet, and link out to your repo or EDA files. Add parts from any
            search result with &quot;Add to BOM&quot;.
          </p>
        </div>
        <Button variant="pri" className="mt-[2px] flex-none" onClick={() => open("new-project")}>
          + New project
        </Button>
      </div>

      {isLoading ? (
        <Panel className="flex items-center justify-center py-16">
          <span className="sub">Loading projects…</span>
        </Panel>
      ) : data.length === 0 ? (
        <EmptyState />
      ) : (
        <ProjectsTable projects={data} />
      )}
    </div>
  );
}
