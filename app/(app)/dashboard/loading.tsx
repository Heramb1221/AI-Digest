// app/(app)/dashboard/loading.tsx
// Shown while the dashboard server component fetches initial data.
// Mirrors the real layout: left list panel + right reader panel.

export default function DashboardLoading() {
  return (
    <div className="flex h-full overflow-hidden">
      {/* Article list panel */}
      <div className="flex flex-col w-[340px] xl:w-[380px] border-r border-border shrink-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
          <div className="h-3 w-32 bg-paper-sunken rounded animate-pulse" />
          <div className="h-7 w-20 bg-paper-sunken rounded animate-pulse" />
        </div>
        {/* Filter tabs */}
        <div className="flex gap-1 px-3 py-2 border-b border-border">
          {[40, 60, 72, 52, 48, 56].map((w, i) => (
            <div key={i} style={{ width: w }} className="h-6 bg-paper-sunken rounded-md animate-pulse" />
          ))}
        </div>
        {/* Count */}
        <div className="px-4 py-1.5 border-b border-border">
          <div className="h-2.5 w-24 bg-paper-sunken rounded animate-pulse" />
        </div>
        {/* Article rows */}
        <div className="flex-1 overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex gap-3 px-4 py-3 border-b border-border/50">
              <div className="h-2 w-2 rounded-full bg-paper-sunken mt-1.5 shrink-0 animate-pulse" />
              <div className="flex-1 flex flex-col gap-1.5">
                <div className="flex gap-1.5">
                  <div className="h-3.5 w-3.5 bg-paper-sunken rounded animate-pulse" />
                  <div className="h-2.5 w-20 bg-paper-sunken rounded animate-pulse" />
                  <div className="h-2.5 w-12 bg-paper-sunken rounded animate-pulse ml-auto" />
                </div>
                <div className="h-3.5 w-full bg-paper-sunken rounded animate-pulse" />
                <div className="h-3.5 w-3/4 bg-paper-sunken rounded animate-pulse" />
                <div className="h-4 w-16 bg-paper-sunken rounded animate-pulse mt-0.5" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reader pane */}
      <div className="flex-1 hidden lg:flex flex-col bg-paper-raised">
        <div className="flex items-center justify-end px-4 py-2 border-b border-border">
          <div className="h-7 w-16 bg-paper-sunken rounded-md animate-pulse" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 opacity-40">
            <div className="h-16 w-16 rounded-full bg-paper-sunken animate-pulse" />
            <div className="h-3 w-28 bg-paper-sunken rounded animate-pulse" />
            <div className="h-2.5 w-44 bg-paper-sunken rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
