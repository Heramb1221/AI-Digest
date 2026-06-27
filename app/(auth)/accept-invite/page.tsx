"use client";
// app/(auth)/accept-invite/page.tsx
// Must wrap useSearchParams in Suspense per Next.js 14 App Router requirements.

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Users, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type State = "loading" | "success" | "error" | "needs-auth";

function AcceptInviteInner() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const token        = searchParams.get("token") ?? "";

  const [state,   setState]   = useState<State>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage("No invite token found in the URL.");
      return;
    }

    fetch("/api/team/accept", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ token }),
    }).then(async (res) => {
      if (res.status === 401) { setState("needs-auth"); return; }
      const data = await res.json();
      if (res.ok) {
        setState("success");
        setMessage(data.message ?? "You've joined the team!");
        setTimeout(() => router.push("/team"), 2000);
      } else {
        setState("error");
        setMessage(data.error ?? "Failed to accept invite.");
      }
    }).catch(() => {
      setState("error");
      setMessage("Network error. Please try again.");
    });
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const iconBg = state === "success" ? "bg-green-50" : state === "error" ? "bg-red-50" : "bg-accent-subtle";

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className={`h-14 w-14 rounded-full flex items-center justify-center ${iconBg}`}>
        {state === "loading"    && <Loader2      size={24} className="animate-spin text-ink-faint" />}
        {state === "success"    && <CheckCircle2 size={24} className="text-green-500" />}
        {state === "error"      && <AlertCircle  size={24} className="text-red-500" />}
        {state === "needs-auth" && <Users        size={24} className="text-accent" />}
      </div>

      {state === "loading" && (
        <><h1 className="text-xl font-semibold">Accepting invite…</h1>
        <p className="text-sm text-ink-muted">Just a moment.</p></>
      )}

      {state === "success" && (
        <><h1 className="text-xl font-semibold">Welcome to the team!</h1>
        <p className="text-sm text-ink-muted">{message} Redirecting…</p></>
      )}

      {state === "error" && (
        <><h1 className="text-xl font-semibold">Invite failed</h1>
        <p className="text-sm text-red-500 mb-2">{message}</p>
        <Link href="/dashboard"><Button variant="outline">Go to dashboard</Button></Link></>
      )}

      {state === "needs-auth" && (
        <><h1 className="text-xl font-semibold">You've been invited!</h1>
        <p className="text-sm text-ink-muted mb-2">
          Sign in or create an account to join the team.
        </p>
        <div className="flex flex-col gap-2 w-full">
          <Link href={`/login?callbackUrl=/accept-invite?token=${encodeURIComponent(token)}`}>
            <Button className="w-full">Sign in to accept</Button>
          </Link>
          <Link href={`/signup?callbackUrl=/accept-invite?token=${encodeURIComponent(token)}`}>
            <Button variant="outline" className="w-full">Create an account</Button>
          </Link>
        </div></>
      )}
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="h-14 w-14 rounded-full bg-paper-sunken flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-ink-faint" />
        </div>
        <p className="text-sm text-ink-muted">Loading…</p>
      </div>
    }>
      <AcceptInviteInner />
    </Suspense>
  );
}
