import type { DiscoverProgramAtAGlance } from "@/lib/guidance/discover/types";

const FIELD_LABELS: Record<keyof DiscoverProgramAtAGlance, string> = {
  degreeLevel: "مقطع",
  programType: "نوع دوره",
  admissionMethod: "شیوه پذیرش",
  tuition: "شهریه",
  continuingEducation: "ادامه تحصیل",
  keyNote: "نکته مهم",
};

export function ProgramAtAGlance({ data }: { data: DiscoverProgramAtAGlance }) {
  const rows = (Object.keys(FIELD_LABELS) as (keyof DiscoverProgramAtAGlance)[])
    .map((key) => ({ key, label: FIELD_LABELS[key], value: data[key] }))
    .filter((row): row is { key: keyof DiscoverProgramAtAGlance; label: string; value: string } =>
      Boolean(row.value && row.value.length > 1),
    );

  if (rows.length === 0) return null;

  return (
    <section className="program-at-a-glance" aria-labelledby="program-at-a-glance-title">
      <h2 id="program-at-a-glance-title">در یک نگاه</h2>
      <dl className="program-at-a-glance__grid">
        {rows.map((row) => (
          <div key={row.key}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
