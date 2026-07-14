"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/meridian";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromUrl = searchParams.get("email");
  const [email, setEmail] = useState(emailFromUrl ?? "");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (emailFromUrl) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (user?.email_confirmed_at) {
        router.replace("/search");
        return;
      }
      if (user?.email) {
        setEmail(user.email);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleResend = useCallback(async () => {
    if (!email) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const { error } = await supabase.auth.resend({
        email,
        type: "signup",
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=/search`,
        },
      });
      if (error) {
        console.error(error);
      } else {
        setSent(true);
      }
    } finally {
      setLoading(false);
    }
  }, [email]);

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <h1 className="text-[21px] font-semibold tracking-tight">
        Verify your email
      </h1>
      {email && (
        <p className="sub mt-3 text-center">
          We sent a verification link to{" "}
          <span className="font-medium text-ink">{email}</span>.
          <br />
          Click the link to activate your account.
        </p>
      )}
      {!email && (
        <p className="sub mt-3 text-center">
          Check your inbox for the verification link we sent you.
        </p>
      )}
      <div className="mt-8">
        {sent ? (
          <p className="mono text-[10px] font-medium uppercase tracking-[0.14em] text-ok">
            Verification email sent! Check your inbox.
          </p>
        ) : (
          <Button
            variant="pri"
            onClick={handleResend}
            disabled={loading || !email}
          >
            {loading ? "Sending..." : "Resend verification email"}
          </Button>
        )}
      </div>
      <p className="mono mt-4 text-[9.5px] uppercase tracking-[0.1em] text-ink3">
        Didn&apos;t receive it? Check your spam folder or try again.
      </p>
    </div>
  );
}
