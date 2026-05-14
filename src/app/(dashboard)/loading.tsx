export default function DashboardLoading() {
  return (
    <div className="space-y-8 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150">
      <div className="h-9 w-64 max-w-full rounded-lg bg-slate-200/80 motion-safe:animate-pulse" />
      <div className="h-4 w-96 max-w-full rounded-md bg-slate-100 motion-safe:animate-pulse" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-8">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 rounded-2xl border border-slate-100 bg-white shadow-sm motion-safe:animate-pulse" />
        ))}
      </div>
      <div className="h-[min(420px,55vh)] rounded-2xl border border-slate-100 bg-white motion-safe:animate-pulse" />
    </div>
  )
}
