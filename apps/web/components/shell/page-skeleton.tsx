/** Placeholder shown inside the shell while a page's data loads. */
export function PageSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading"
      className="animate-pulse space-y-6"
    >
      <div className="space-y-2">
        <div className="bg-muted h-9 w-48 rounded-lg" />
        <div className="bg-muted h-4 w-64 rounded" />
      </div>
      <div className="bg-muted h-40 rounded-2xl" />
      <div className="space-y-3">
        <div className="bg-muted h-20 rounded-2xl" />
        <div className="bg-muted h-20 rounded-2xl" />
      </div>
    </div>
  );
}
