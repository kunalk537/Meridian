"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/shell/Logo";
import { Button } from "@/components/meridian";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { useToast } from "@/lib/hooks/useToast";
import { cn, safeNextPath } from "@/lib/utils";

type Mode = "in" | "up";
type View = "credentials" | "forgot";

const EMAIL_RE = /\S+@\S+\.\S+/;

interface AuthFormProps {
  initialMode?: Mode;
  next?: string;
}

export function AuthForm({ initialMode = "in", next }: AuthFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [view, setView] = useState<View>("credentials");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const configured = isSupabaseConfigured();

  const redirect = safeNextPath(next);

  const validate = useCallback((): string | null => {
    if (mode === "up" && !name.trim()) return "NAME IS REQUIRED";
    if (!EMAIL_RE.test(email)) return "ENTER A VALID EMAIL";
    if (password.length < 4) return "PASSWORD TOO SHORT · MIN 4 CHARACTERS";
    return null;
  }, [mode, name, email, password]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const err = validate();
      if (err) {
        toast(err, "bad");
        return;
      }

      if (!configured) {
        router.push(redirect);
        return;
      }

      setLoading(true);
      const supabase = createClient();

      try {
        if (mode === "up") {
          const origin = window.location.origin;
          const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { full_name: name.trim() },
              emailRedirectTo: `${origin}/auth/callback?next=/search`,
            },
          });
          if (error) {
            toast(error.message, "bad");
            return;
          }
          router.push("/verify-email");
        } else {
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (error) {
            const msg = error.message?.toLowerCase() ?? "";
            if (msg.includes("not confirmed") || error.code === "email_not_confirmed") {
              router.push(`/verify-email?email=${encodeURIComponent(email)}`);
              return;
            }
            toast(error.message, "bad");
            return;
          }
          router.push(redirect);
        }
      } catch {
        toast("Something went wrong. Please try again.", "bad");
      } finally {
        setLoading(false);
      }
    },
    [mode, name, email, password, configured, redirect, validate, toast, router],
  );

  const handleGoogle = useCallback(async () => {
    if (!configured) {
      router.push(redirect);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const origin = window.location.origin;

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirect)}` },
      });
      if (error) {
        toast(error.message, "bad");
        setLoading(false);
      }
    } catch {
      toast("Google sign-in failed. Please try again.", "bad");
      setLoading(false);
    }
  }, [configured, redirect, toast, router]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        const form = (e.currentTarget as HTMLInputElement).form;
        form?.requestSubmit();
      }
    },
    [],
  );

  const openForgotPassword = useCallback(() => {
    setForgotEmail(email);
    setForgotSent(false);
    setView("forgot");
  }, [email]);

  const backToSignIn = useCallback(() => {
    setView("credentials");
  }, []);

  const handleForgotSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!EMAIL_RE.test(forgotEmail)) {
        toast("ENTER A VALID EMAIL", "bad");
        return;
      }

      if (!configured) {
        toast("Auth is disabled until Supabase is configured.", "bad");
        return;
      }

      setForgotLoading(true);
      const supabase = createClient();
      const origin = window.location.origin;

      try {
        const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
        });
        if (error) {
          toast(error.message, "bad");
          return;
        }
        setForgotSent(true);
      } catch {
        toast("Something went wrong. Please try again.", "bad");
      } finally {
        setForgotLoading(false);
      }
    },
    [forgotEmail, configured, toast],
  );

  const ctaLabel = mode === "up" ? "Create account" : "Sign in";

  return (
    <>
      <Logo />

      <p className="sub mt-3">
        AI copilot for sourcing and managing your electronic components.
      </p>

      {view === "credentials" ? (
        <>
          {/* Tab bar */}
          <div
            className="mt-5 flex gap-0.5"
            style={{ borderBottom: "1px solid var(--line2)" }}
          >
            {(
              [
                { key: "in" as const, label: "Sign in" },
                { key: "up" as const, label: "Create account" },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setMode(t.key);
                }}
                className="mono relative cursor-pointer border-none bg-transparent px-3 pb-2 pt-2 text-[10px] font-medium uppercase tracking-[0.1em]"
                style={{
                  color: mode === t.key ? "var(--acc)" : "var(--ink3)",
                  borderBottom:
                    mode === t.key
                      ? "2px solid var(--acc)"
                      : "2px solid transparent",
                  marginBottom: "-1px",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
            {mode === "up" && (
              <div>
                <label className="lbl mb-1.5 block">Full name</label>
                <input
                  className="inp"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ava Koenig"
                  autoComplete="name"
                />
              </div>
            )}

            <div>
              <label className="lbl mb-1.5 block">Work email</label>
              <input
                className="inp"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="you@company.com"
                autoComplete="email"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="lbl">Password</label>
                {mode === "in" && (
                  <button
                    type="button"
                    onClick={openForgotPassword}
                    className="mono cursor-pointer border-none bg-transparent text-[10px] uppercase tracking-[0.05em] text-ink3 hover:text-acc"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                className="inp"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="••••••••"
                autoComplete={mode === "in" ? "current-password" : "new-password"}
              />
            </div>

            <Button
              type="submit"
              variant="pri"
              className="mt-1 w-full"
              disabled={loading}
            >
              {loading ? "Please wait..." : ctaLabel}
            </Button>
          </form>

          {/* Divider */}
          <div className="my-4 flex items-center gap-2.5">
            <span className="h-px flex-1 bg-line" />
            <span className="lbl text-[8.5px]">or</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          {/* Google OAuth */}
          <Button
            type="button"
            variant="default"
            className="w-full"
            onClick={handleGoogle}
            disabled={loading}
          >
            <svg width="14" height="14" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.9-.1-1.7-.2-2.5H12v4.8h6.5c-.3 1.5-1.1 2.8-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.7-4.9H1.3v3.1C3.3 21.4 7.3 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.3 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4V6.5H1.3C.5 8.2 0 10 0 12s.5 3.8 1.3 5.5l4-3.1z"
              />
              <path
                fill="#EA4335"
                d="M12 4.7c1.8 0 3.3.6 4.6 1.8L20 3C18 1.1 15.2 0 12 0 7.3 0 3.3 2.6 1.3 6.5l4 3.1c1-2.8 3.6-4.9 6.7-4.9z"
              />
            </svg>
            Continue with Google
          </Button>

          <p className="mt-3.5 text-[11px] leading-relaxed text-ink3">
            Works with personal Google and Google Workspace accounts — your team
            signs in with the org domain it already uses.
          </p>

          {!configured && (
            <div className="mt-3 rounded bg-panel2 px-3 py-2 text-[11px] text-ink3">
              Auth is disabled until Supabase is configured.{" "}
              <a href={redirect} className="text-acc underline">
                Continue to app (demo mode)
              </a>
            </div>
          )}
        </>
      ) : forgotSent ? (
        <div className="mt-5">
          <p className="sub">
            If an account exists for <strong>{forgotEmail}</strong>, we&apos;ve
            sent a link to reset your password. Check your inbox and follow
            the link to choose a new one.
          </p>
          <Button
            type="button"
            variant="default"
            className="mt-4 w-full"
            onClick={backToSignIn}
          >
            Back to sign in
          </Button>
        </div>
      ) : (
        <form onSubmit={handleForgotSubmit} className="mt-5 flex flex-col gap-3">
          <p className="sub">
            Enter your account email and we&apos;ll send you a link to reset
            your password.
          </p>
          <div>
            <label className="lbl mb-1.5 block">Work email</label>
            <input
              className="inp"
              type="email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
              autoFocus
            />
          </div>
          <Button
            type="submit"
            variant="pri"
            className="mt-1 w-full"
            disabled={forgotLoading}
          >
            {forgotLoading ? "Sending..." : "Send reset link"}
          </Button>
          <button
            type="button"
            onClick={backToSignIn}
            className="mono cursor-pointer self-center border-none bg-transparent text-[10px] uppercase tracking-[0.1em] text-ink3 hover:text-acc"
          >
            Back to sign in
          </button>
        </form>
      )}
    </>
  );
}
