// app/loading.tsx
// Shown during top-level Suspense boundaries / page navigations.

export default function RootLoading() {
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-5 w-5 rounded-full border-2 border-border border-t-accent animate-spin" />
        <p className="text-xs text-ink-faint">Loading…</p>
      </div>
    </div>
  );
}
