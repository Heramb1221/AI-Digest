"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Input }  from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

function ResetPasswordInner() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const token        = searchParams.get("token") ?? "";

  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [loading,   setLoading]   = useState(false);
  const [success,   setSuccess]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  if (!token) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <AlertCircle size={28} className="text-red-500" />
        <p className="text-sm text-ink-muted">
          Invalid reset link. Please{" "}
          <Link href="/forgot-password" className="text-accent underline underline-offset-2">
            request a new one
          </Link>
          .
        </p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center">
          <CheckCircle2 size={22} className="text-green-500" />
        </div>
        <div>
          <h1 className="text-xl font-semibold mb-1">Password updated</h1>
          <p className="text-sm text-ink-muted">You can now sign in with your new password.</p>
        </div>
        <Button onClick={() => router.push("/login")}>Sign in</Button>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const res  = await fetch("/api/auth/reset-password", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ token, password }),
    });
    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setSuccess(true);
    } else {
      setError(data.error ?? "Something went wrong.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Choose a new password</h1>
        <p className="text-sm text-ink-muted mt-1">Must be at least 8 characters.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="New password"
          type="password"
          placeholder="Min. 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
        <Input
          label="Confirm password"
          type="password"
          placeholder="Repeat your password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          required
        />

        {error && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </p>
        )}

        <Button type="submit" loading={loading} className="w-full">
          Update password
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-32">
        <Loader2 size={20} className="animate-spin text-ink-faint" />
      </div>
    }>
      <ResetPasswordInner />
    </Suspense>
  );
}
