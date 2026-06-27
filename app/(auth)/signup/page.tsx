"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";

function SignupForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const ref          = searchParams.get("ref") ?? "";
  const callbackUrl  = searchParams.get("callbackUrl") ?? "/onboarding";

  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [errors,   setErrors]   = useState<Record<string, string>>({});
  const [loading,  setLoading]  = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim())        e.name     = "Name is required.";
    if (!email.trim())       e.email    = "Email is required.";
    if (password.length < 8) e.password = "Password must be at least 8 characters.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setApiError(null);
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        name:         name.trim(),
        email:        email.trim(),
        password,
        referralCode: ref,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setApiError(data.error ?? "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    // Auto sign-in after registration
    await signIn("credentials", {
      email:    email.trim(),
      password,
      redirect: false,
    });

    setLoading(false);
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Create an account</h1>
        <p className="text-sm text-ink-muted mt-1">
          Already have one?{" "}
          <Link href="/login" className="text-accent hover:underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>

      {ref && (
        <div className="flex items-center gap-2 bg-accent-subtle text-accent text-xs font-medium rounded px-3 py-2">
          <span>🎉</span>
          <span>You were referred — your friend gets a free month when you upgrade.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Full name"
          type="text"
          placeholder="Ada Lovelace"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          autoComplete="name"
          required
        />
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          autoComplete="email"
          required
        />
        <Input
          label="Password"
          type="password"
          placeholder="Min. 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          autoComplete="new-password"
          required
        />

        {apiError && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">
            {apiError}
          </p>
        )}

        <Button type="submit" loading={loading} className="w-full mt-1">
          Create account
        </Button>
      </form>

      <p className="text-xs text-ink-faint text-center">
        By creating an account you agree to our{" "}
        <Link href="/terms" className="underline underline-offset-2">Terms</Link>
        {" "}and{" "}
        <Link href="/privacy" className="underline underline-offset-2">Privacy Policy</Link>.
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-8 w-40 bg-paper-sunken rounded" />
        <div className="h-9 bg-paper-sunken rounded" />
        <div className="h-9 bg-paper-sunken rounded" />
        <div className="h-9 bg-paper-sunken rounded" />
        <div className="h-9 bg-paper-sunken rounded" />
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}
