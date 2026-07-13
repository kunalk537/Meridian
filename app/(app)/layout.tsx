import { Header } from "@/components/shell/Header";
import { ModalHost } from "@/components/shell/ModalHost";
import { CompareTray } from "@/components/compare/CompareTray";

/** Authenticated app shell: fixed header + scrollable content + modal host. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header />
      <main className="flex-1 overflow-y-auto">{children}</main>
      <CompareTray />
      <ModalHost />
    </div>
  );
}
