"use client";

import { Button } from "@/components/meridian";
import { useModals } from "@/lib/hooks/useModals";

export function EmptyState() {
  const { open } = useModals();

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="sub mb-4">
        No projects yet — create one to start a BOM.
      </p>
      <Button variant="pri" onClick={() => open("new-project")}>
        + New project
      </Button>
    </div>
  );
}
