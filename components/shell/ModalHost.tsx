import { McpModal } from "@/components/modals/McpModal";
import { SourcesModal } from "@/components/modals/SourcesModal";
import { ProfileModal } from "@/components/modals/ProfileModal";
import { NewProjectModal } from "@/components/modals/NewProjectModal";

/**
 * Renders every named modal (MCP / Sources / Profile / New project). Each
 * modal drives its own open state via useModals(), so this host just mounts
 * them; it is itself mounted once in app/(app)/layout.tsx.
 */
export function ModalHost() {
  return (
    <>
      <McpModal />
      <SourcesModal />
      <ProfileModal />
      <NewProjectModal />
    </>
  );
}
