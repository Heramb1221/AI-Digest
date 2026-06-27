// components/dashboard/empty-digest.tsx
// Shown in the article list when the user has no sources yet.
// Server component — no interactivity needed.

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Rss, Youtube, MessageSquare, Globe } from "lucide-react";

const SOURCE_TYPES = [
  { icon: Rss,           label: "RSS / Blogs",         example: "TechCrunch, The Verge"       },
  { icon: Youtube,       label: "YouTube channels",     example: "Fireship, Theo, Primeagen"   },
  { icon: MessageSquare, label: "Subreddits",           example: "r/programming, r/MachineLearning" },
  { icon: Globe,         label: "Any webpage",          example: "news.ycombinator.com"        },
];

export function EmptyDigest() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 py-16">
      <div className="h-16 w-16 rounded-2xl bg-paper-sunken flex items-center justify-center mb-5">
        <span className="text-3xl">🌅</span>
      </div>

      <h2 className="text-base font-semibold mb-2">Your digest is empty</h2>
      <p className="text-sm text-ink-muted mb-8 max-w-xs leading-relaxed">
        Add your first source and run a refresh to get AI-summarised articles in your inbox.
      </p>

      {/* Source type chips */}
      <div className="grid grid-cols-2 gap-2 mb-8 w-full max-w-xs">
        {SOURCE_TYPES.map(({ icon: Icon, label, example }) => (
          <div
            key={label}
            className="flex flex-col gap-0.5 p-3 rounded-xl border border-border bg-paper-raised text-left"
          >
            <div className="flex items-center gap-1.5 text-xs font-medium text-ink mb-0.5">
              <Icon size={12} className="text-ink-faint" />
              {label}
            </div>
            <p className="text-2xs text-ink-faint">{example}</p>
          </div>
        ))}
      </div>

      <Link href="/settings/sources">
        <Button>Add your first source</Button>
      </Link>

      <p className="text-xs text-ink-faint mt-4">
        Already have feeds? <Link href="/settings/sources" className="text-accent underline underline-offset-2">Import OPML</Link>
      </p>
    </div>
  );
}
