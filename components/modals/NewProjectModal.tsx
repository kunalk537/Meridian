"use client";

/**
 * New project modal — name, description, build quantity; creates via
 * useProjects().create and routes to the new project's BOM page.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal } from "@/components/meridian";
import { useModals } from "@/lib/hooks/useModals";
import { useToast } from "@/lib/hooks/useToast";
import { useProjects } from "@/lib/hooks/data";

export function NewProjectModal() {
  const { isOpen, close } = useModals();
  const { toast } = useToast();
  const router = useRouter();
  const { create } = useProjects();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [buildQty, setBuildQty] = useState("10");

  function reset() {
    setName("");
    setDescription("");
    setBuildQty("10");
  }

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast("Project name is required", "warn");
      return;
    }
    const qty = Math.max(1, parseInt(buildQty, 10) || 1);
    const project = await create.mutateAsync({
      name: trimmed,
      description: description.trim() || null,
      build_qty: qty,
    });
    if (!project) {
      toast("Sign in to create a project", "warn");
      return;
    }
    toast("Project created", "ok");
    reset();
    close();
    router.push(`/projects/${project.id}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") submit();
  }

  return (
    <Modal
      open={isOpen("new-project")}
      onClose={() => {
        reset();
        close();
      }}
      className="max-w-[420px]"
      title="New project"
    >
      <div className="lbl mb-1.5">Project name</div>
      <input
        className="inp mb-3"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="e.g. Motor Driver Rev A"
      />
      <div className="lbl mb-1.5">What are you building? (shown as the project summary)</div>
      <input
        className="inp mb-3"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Short description of the design"
      />
      <div className="lbl mb-1.5">Build quantity (boards)</div>
      <input
        className="inp mb-4 w-[120px]"
        value={buildQty}
        onChange={(e) => setBuildQty(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="10"
        inputMode="numeric"
      />
      <div className="flex justify-end gap-2">
        <Button size="sm" onClick={close}>
          Cancel
        </Button>
        <Button size="sm" variant="pri" onClick={submit} disabled={create.isPending}>
          {create.isPending ? "Creating…" : "Create project"}
        </Button>
      </div>
    </Modal>
  );
}
