export default function DashboardLoading() {
  // Audit fix: skeleton used 3 tiles while the summary dashboard renders 5 metric cards.
  return (
    <div className="space-y-8 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150">
      <div className="h-9 w-64 max-w-full rounded-lg bg-slate-200/80 motion-safe:animate-pulse" />
      <div className="h-4 w-96 max-w-full rounded-md bg-slate-100 motion-safe:animate-pulse" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5 md:gap-3 lg:grid-cols-5 lg:gap-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-2xl border border-slate-100 bg-white shadow-sm motion-safe:animate-pulse" />
        ))}
      </div>
      <div className="h-[min(420px,55vh)] rounded-2xl border border-slate-100 bg-white motion-safe:animate-pulse" />
    </div>
  )
}
