"use client";
import { useState } from "react";
import { PERM_GROUPS, PRESETS } from "@/lib/perms";

/** Permission checkboxes (name="perms") with quick presets. `grantable` = keys this editor may change. */
export function PermPicker({ initial, grantable }: { initial: string[]; grantable: string[] }) {
  const [sel, setSel] = useState<Set<string>>(new Set(initial));
  const toggle = (k: string) => setSel((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const apply = (perms: readonly string[]) => setSel((s) => new Set([...[...s].filter((k) => !grantable.includes(k)), ...perms.filter((k) => grantable.includes(k))]));
  const active = PRESETS.find((p) => p.perms.length === [...sel].filter((k) => grantable.includes(k)).length && p.perms.every((k) => sel.has(k)))?.key;
  return (
    <div>
      <p className="label">قالب‌های آماده</p>
      <div className="mb-5 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button key={p.key} type="button" onClick={() => apply(p.perms)} className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${active === p.key ? "border-royal bg-royal text-white" : "border-line bg-paper hover:border-royal/50 hover:text-royal"}`}>
            {p.label}
          </button>
        ))}
        <button type="button" onClick={() => apply([])} className="rounded-full border border-dashed border-line px-3.5 py-1.5 text-sm text-muted hover:border-gc hover:text-gc">پاک کردن همه</button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {PERM_GROUPS.map((g) => (
          <fieldset key={g.title} className="rounded-2xl border border-line bg-ivory/60 p-4">
            <legend className="px-1 text-sm font-extrabold text-navy">{g.title}</legend>
            <div className="mt-1 space-y-1.5">
              {g.perms.map((p) => {
                const locked = !grantable.includes(p.key);
                const on = sel.has(p.key);
                return (
                  <label key={p.key} className={`flex items-start gap-3 rounded-xl px-2.5 py-2 transition ${locked ? "cursor-not-allowed opacity-55" : "cursor-pointer hover:bg-paper"} ${on && !locked ? "bg-paper shadow-sm" : ""}`}>
                    <input type="checkbox" name="perms" value={p.key} checked={on} disabled={locked} onChange={() => toggle(p.key)} className="mt-1 size-4 shrink-0 accent-royal" />
                    <span>
                      <span className="block text-sm font-bold">{p.label}</span>
                      {p.hint && <span className="block text-xs leading-5 text-muted">{p.hint}</span>}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">{sel.size.toLocaleString("fa-IR")} دسترسی انتخاب شده.</p>
    </div>
  );
}

/** Text password input with a "random password" helper (the owner tells it to the colleague once). */
export function PasswordField({ name = "password", label, required = true }: { name?: string; label: string; required?: boolean }) {
  const [v, setV] = useState("");
  const gen = () => {
    const a = "abcdefghjkmnpqrstuvwxyz23456789";
    const r = crypto.getRandomValues(new Uint32Array(10));
    setV(Array.from(r, (x) => a[x % a.length]).join(""));
  };
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="flex gap-2">
        <input name={name} value={v} onChange={(e) => setV(e.target.value)} dir="ltr" autoComplete="new-password" minLength={8} required={required} className="input font-mono" placeholder="دست‌کم ۸ نویسه" />
        <button type="button" onClick={gen} className="btn-ghost shrink-0 px-3 py-2 text-xs">رمز تصادفی</button>
      </div>
    </label>
  );
}
