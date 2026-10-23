import type { ContactSettings } from "@/lib/settings";
import { Star } from "./Star";

export function BranchList({ contact }: { contact: ContactSettings }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {contact.branches.map((b) => (
        <div key={b.name} className="card p-6">
          <p className="flex items-center gap-2 font-extrabold text-navy"><Star className="size-4 text-gold" />{b.name}</p>
          <p className="mt-2 leading-8 text-ink/85">{b.address}</p>
          {b.mapUrl && (
            <a href={b.mapUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex text-sm font-bold text-edu hover:underline">
              مسیریابی در نقشه ←
            </a>
          )}
        </div>
      ))}
      <div className="card bg-ivory p-6">
        <p className="flex items-center gap-2 font-extrabold text-navy"><Star className="size-4 text-gold" />ساعات کاری</p>
        <ul className="mt-2 space-y-1 leading-8 text-ink/85">
          {contact.hours.map((h) => <li key={h}>{h}</li>)}
        </ul>
      </div>
    </div>
  );
}
