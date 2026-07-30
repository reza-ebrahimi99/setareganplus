import { AdmissionsGlassCard } from "@/components/admin/admissions/AdmissionsGlassCard";

function Pulse({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-slate-100/90 ${className ?? ""}`}
    />
  );
}

export function AdmissionsWorkspaceSkeleton() {
  return (
    <div
      className="space-y-5"
      aria-busy="true"
      aria-label="در حال بارگذاری میز کار پذیرش"
    >
      <div className="space-y-2">
        <Pulse className="h-4 w-28" />
        <Pulse className="h-8 w-48 sm:w-64" />
        <Pulse className="h-4 w-full max-w-md" />
      </div>

      {/* Mobile: stacked metrics · Desktop: row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <AdmissionsGlassCard key={i} className="p-4">
            <Pulse className="h-3 w-16" />
            <Pulse className="mt-3 h-9 w-20" />
            <Pulse className="mt-2 h-3 w-12" />
          </AdmissionsGlassCard>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <AdmissionsGlassCard className="p-4 lg:col-span-5 sm:p-5">
          <Pulse className="h-4 w-24" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i}>
                <Pulse className="mb-1 h-3 w-full" />
                <Pulse className="h-2 w-full" />
              </div>
            ))}
          </div>
        </AdmissionsGlassCard>
        <div className="grid gap-4 lg:col-span-7">
          {Array.from({ length: 3 }, (_, i) => (
            <AdmissionsGlassCard key={i} className="p-4 sm:p-5">
              <Pulse className="h-4 w-28" />
              <div className="mt-4 space-y-3">
                <Pulse className="h-10 w-full" />
                <Pulse className="h-10 w-full" />
                <Pulse className="h-10 w-4/5" />
              </div>
            </AdmissionsGlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}
