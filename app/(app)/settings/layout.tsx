"use client";
// app/(app)/settings/layout.tsx
// Settings section layout with sub-nav.
// Client component so we can read pathname for active state.

import Link      from "next/link";
import { usePathname } from "next/navigation";
import { cn }   from "@/lib/utils";

const SETTINGS_NAV = [
  { href: "/settings",               label: "Profile"        },
  { href: "/settings/sources",       label: "Sources"        },
  { href: "/settings/ai",            label: "AI & API key"   },
  { href: "/settings/notifications", label: "Notifications"  },
  { href: "/settings/billing",       label: "Billing"        },
  { href: "/settings/referrals",     label: "Referrals"      },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-lg font-semibold mb-6">Settings</h1>

      <div className="flex gap-8">
        {/* Sub-nav */}
        <nav className="flex flex-col gap-0.5 w-44 shrink-0">
          {SETTINGS_NAV.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  active
                    ? "bg-accent-subtle text-accent"
                    : "text-ink-muted hover:bg-paper-sunken hover:text-ink"
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
