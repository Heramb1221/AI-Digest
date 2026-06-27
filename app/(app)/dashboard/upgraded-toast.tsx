"use client";
// app/(app)/dashboard/upgraded-toast.tsx
// Reads ?upgraded=true from the URL (set by Stripe on checkout success)
// and fires a toast notification. Cleans up the query param after.
// Must be wrapped in Suspense because it calls useSearchParams().

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useToast } from "@/components/ui/toaster";

function UpgradedToastInner() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const pathname     = usePathname();
  const { toast }    = useToast();

  useEffect(() => {
    if (searchParams.get("upgraded") === "true") {
      toast({
        title:       "Welcome to Pro! 🎉",
        description: "Your plan has been activated. All features are now unlocked.",
        type:        "success",
      });
      router.replace(pathname);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

// The Suspense wrapper lives here — callers just render <UpgradedToast />
export function UpgradedToast() {
  return (
    <Suspense fallback={null}>
      <UpgradedToastInner />
    </Suspense>
  );
}
