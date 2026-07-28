"use client";

import { addBlockAction } from "@/app/admin/(dashboard)/registrations/flows/[id]/experience/actions";
import { REGISTRATION_FORM_BLOCK_TYPE } from "@/lib/experience/blocks/registration-form";
import { BLOCK_TYPE_OPTIONS } from "@/lib/experience/registry";

const ICON_FALLBACK: Record<string, string> = {
  hero: "⌂",
  image: "▣",
  text: "¶",
  features: "☰",
  pricing: "﷼",
  countdown: "◷",
  capacity: "▥",
  form: "▣",
  cta: "➔",
  spacer: "↕",
};

type ExperienceBlockLibraryProps = {
  flowId: string;
  experienceId: string;
  versionId: string;
  canManage: boolean;
  hasEnabledRegistrationForm: boolean;
  compact?: boolean;
};

export function ExperienceBlockLibrary({
  flowId,
  experienceId,
  versionId,
  canManage,
  hasEnabledRegistrationForm,
  compact = false,
}: ExperienceBlockLibraryProps) {
  const grouped = new Map<string, typeof BLOCK_TYPE_OPTIONS>();
  for (const option of BLOCK_TYPE_OPTIONS) {
    const list = grouped.get(option.categoryFa) ?? [];
    list.push(option);
    grouped.set(option.categoryFa, list);
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div>
        <h3 className="text-sm font-semibold text-primary">کتابخانه بلوک‌ها</h3>
        <p className="mt-1 text-xs leading-6 text-muted">
          فقط انواع ثبت‌شده در رجیستری قابل افزودن هستند.
        </p>
      </div>

      {[...grouped.entries()].map(([category, options]) => (
        <div key={category} className="space-y-2">
          <p className="text-xs font-medium text-muted">{category}</p>
          <ul className="space-y-2">
            {options.map((option) => {
              const isForm = option.type === REGISTRATION_FORM_BLOCK_TYPE;
              const blocked = isForm && hasEnabledRegistrationForm;
              const icon =
                (option.iconKey && ICON_FALLBACK[option.iconKey]) || "◆";

              return (
                <li key={option.type}>
                  <form action={addBlockAction}>
                    <input type="hidden" name="flowId" value={flowId} />
                    <input
                      type="hidden"
                      name="experienceId"
                      value={experienceId}
                    />
                    <input type="hidden" name="versionId" value={versionId} />
                    <input type="hidden" name="type" value={option.type} />
                    <button
                      type="submit"
                      disabled={!canManage || blocked}
                      className="flex w-full min-h-11 items-start gap-3 rounded-xl border border-border bg-white px-3 py-2.5 text-right disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span
                        className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/5 text-sm text-primary"
                        aria-hidden
                      >
                        {icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-primary">
                          {option.labelFa}
                        </span>
                        <span className="mt-0.5 block text-xs leading-5 text-muted">
                          {option.descriptionFa}
                        </span>
                        {blocked ? (
                          <span className="mt-1 block text-xs text-amber-800">
                            فقط یک بلوک فرم ثبت‌نام فعال مجاز است.
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
