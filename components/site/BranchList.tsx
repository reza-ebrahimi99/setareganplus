import type { ContactSettings } from "@/lib/settings";
import { Icon } from "./Star";

export function BranchList({ contact }: { contact: ContactSettings }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {contact.branches.map((b) => (
        <div key={b.name} className="reveal card card-hover flex flex-col p-6">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-sky text-royal"><Icon name="pin" className="size-6" /></span>
          <p className="mt-4 text-lg font-black text-navy">{b.name}</p>
          <p className="mt-2 flex-1 leading-8 text-ink/80">{b.address}</p>
          {b.mapUrl && (
            <a href={b.mapUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost mt-5 self-start px-4 py-2 text-sm">
              مسیریابی در نقشه <Icon name="arrow" className="size-4" />
            </a>
          )}
        </div>
      ))}
      {contact.hours.length > 0 && (
        <div className="reveal card flex flex-col bg-gradient-to-br from-[#fff8e6] to-white p-6">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-gold/20 text-gold-ink"><Icon name="clock" className="size-6" /></span>
          <p className="mt-4 text-lg font-black text-navy">ساعات کاری</p>
          <ul className="mt-2 space-y-1 leading-8 text-ink/80">
            {contact.hours.map((h) => <li key={h}>{h}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
