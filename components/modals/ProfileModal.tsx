"use client";

/**
 * Profile modal — edit full name / email via Supabase user metadata, sign out.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal } from "@/components/meridian";
import { useModals } from "@/lib/hooks/useModals";
import { useToast } from "@/lib/hooks/useToast";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function ProfileModal() {
  const { isOpen, close } = useModals();
  const { toast } = useToast();
  const router = useRouter();
  const configured = isSupabaseConfigured();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen("profile") || !configured) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (u) {
        setName((u.user_metadata?.full_name as string) ?? "");
        setEmail(u.email ?? "");
      }
    });
  }, [isOpen, configured]);

  async function save() {
    if (!configured) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      email: email || undefined,
      data: { full_name: name },
    });
    setSaving(false);
    if (error) {
      toast(error.message, "bad");
      return;
    }
    toast("Profile updated", "ok");
    close();
  }

  async function signOut() {
    if (configured) await createClient().auth.signOut();
    close();
    router.push("/sign-in");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") save();
  }

  return (
    <Modal open={isOpen("profile")} onClose={close} className="max-w-[380px]" title="Edit profile">
      {!configured && (
        <p className="sub mb-3">
          Supabase isn&apos;t configured for this deployment, so profile editing is
          disabled.
        </p>
      )}
      <div className="lbl mb-1.5">Full name</div>
      <input
        className="inp mb-3"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Your name"
        disabled={!configured}
      />
      <div className="lbl mb-1.5">Email</div>
      <input
        className="inp mb-4"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="you@company.com"
        disabled={!configured}
      />
      <div className="flex items-center justify-between gap-2">
        <Button size="sm" onClick={signOut}>
          Sign out
        </Button>
        <div className="flex gap-2">
          <Button size="sm" onClick={close}>
            Cancel
          </Button>
          <Button size="sm" variant="pri" onClick={save} disabled={!configured || saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
