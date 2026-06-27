"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Rss, Settings, Users, LogOut, ChevronDown,
  BookOpen, Zap, Moon, Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Plan } from "@prisma/client";

interface AppShellProps {
  user: {
    id:    string;
    name?: string | null;
    email?: string | null;
    plan:  Plan;
  };
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { href: "/dashboard",         label: "Digest",   icon: BookOpen },
  { href: "/settings/sources",  label: "Sources",  icon: Rss      },
  { href: "/team",              label: "Team",     icon: Users    },
  { href: "/settings",          label: "Settings", icon: Settings },
];

export function AppShell({ user, children }: AppShellProps) {
  const pathname       = usePathname();
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex h-screen overflow-hidden bg-paper">
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className="flex flex-col w-[220px] border-r border-border bg-paper-raised shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 h-14 border-b border-border">
          <span className="font-semibold text-sm tracking-tight">AI Digest</span>
          {user.plan !== "FREE" && (
            <span className="ml-auto text-2xs font-semibold uppercase tracking-wider text-accent bg-accent-subtle px-1.5 py-0.5 rounded">
              {user.plan}
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 px-2 overflow-y-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-100",
                  active
                    ? "bg-accent-subtle text-accent"
                    : "text-ink-muted hover:bg-paper-sunken hover:text-ink"
                )}
              >
                <Icon size={15} />
                {label}
              </Link>
            );
          })}
          {/* Admin link — only visible to the ADMIN_EMAIL account */}
          {user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL && (
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-100 mt-1 border-t border-border pt-3",
                pathname === "/admin"
                  ? "bg-accent-subtle text-accent"
                  : "text-ink-muted hover:bg-paper-sunken hover:text-ink"
              )}
            >
              <Settings size={15} />
              Admin
            </Link>
          )}
        </nav>

        {/* Digest stats — shown only on dashboard */}
        {pathname === "/dashboard" && (
          <div className="px-4 py-2 border-t border-border">
            <p className="text-2xs text-ink-faint">Daily refresh at 06:00 UTC</p>
          </div>
        )}

        {/* User section */}
        <div className="border-t border-border p-3 flex flex-col gap-1">
          {/* Theme toggle */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-ink-muted hover:bg-paper-sunken hover:text-ink transition-colors w-full"
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>

          {/* User info */}
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-md">
            <div className="h-6 w-6 rounded-full bg-accent-subtle flex items-center justify-center text-accent text-xs font-semibold shrink-0">
              {(user.name ?? user.email ?? "?")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{user.name ?? "Account"}</p>
              <p className="text-2xs text-ink-faint truncate">{user.email}</p>
            </div>
          </div>

          {/* Sign out */}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-ink-muted hover:bg-paper-sunken hover:text-red-500 transition-colors w-full"
          >
            <LogOut size={15} />
            Sign out
          </button>

          {/* Upgrade CTA for free users */}
          {user.plan === "FREE" && (
            <Link href="/settings/billing" className="mt-1">
              <div className="flex items-center gap-2 bg-accent-subtle text-accent text-xs font-medium rounded-md px-3 py-2 hover:bg-accent/20 transition-colors cursor-pointer">
                <Zap size={12} />
                Upgrade to Pro
              </div>
            </Link>
          )}
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
