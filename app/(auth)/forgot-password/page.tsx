"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Input }  from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email,     setEmail]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/forgot-password", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email: email.trim() }),
    });

    setLoading(false);

    if (res.ok) {
      setSubmitted(true);
    } else {
      const data = await res.json();
      setError(data.error ?? "Something went wrong.");
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center">
          <CheckCircle2 size={22} className="text-green-500" />
        </div>
        <div>
          <h1 className="text-xl font-semibold mb-1">Check your inbox</h1>
          <p className="text-sm text-ink-muted leading-relaxed">
            If <strong>{email}</strong> has an account, we've sent a reset link.
            It expires in 1 hour.
          </p>
        </div>
        <Link href="/login" className="text-sm text-accent hover:underline underline-offset-4">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Reset your password</h1>
        <p className="text-sm text-ink-muted mt-1">
          Enter your email and we'll send a reset link.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />

        {error && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </p>
        )}

        <Button type="submit" loading={loading} className="w-full">
          Send reset link
        </Button>
      </form>

      <p className="text-sm text-center text-ink-muted">
        Remembered it?{" "}
        <Link href="/login" className="text-accent hover:underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}
