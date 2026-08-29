import type { Metadata } from "next";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  createAutomationFromPresetAction,
  createAutomationRuleAction,
  toggleAutomationRuleAction,
} from "@/app/admin/(dashboard)/settings/automations/actions";
import { adminBreadcrumbs } from "@/content/admin";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { AUTOMATION_PRESETS } from "@/lib/crm/automation-contract";
import { toPersianDigits } from "@/lib/persian";
import { prisma } from "@/lib/prisma";
import { DomainEventType } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "اتوماسیون CRM",
};

export default async function AdminAutomationsPage() {
  const session = await requireAdminSession();
  const organizationId = session.organization.id;

  const [rules, forms, services, execStats, failedExecs] = await Promise.all([
    prisma.automationRule.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.form.findMany({
      where: { organizationId, deletedAt: null },
      select: { id: true, slug: true },
      take: 50,
    }),
    prisma.bookingService.findMany({
      where: { organizationId, deletedAt: null },
      select: { id: true, title: true, slug: true },
      take: 50,
    }),
    prisma.automationExecution.groupBy({
      by: ["status"],
      where: { organizationId },
      _count: { _all: true },
    }),
    prisma.automationExecution.findMany({
      where: {
        organizationId,
        status: { in: ["FAILED", "DEAD_LETTER"] },
      },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: {
        id: true,
        status: true,
        errorCode: true,
        lastError: true,
        createdAt: true,
        automationRule: { select: { name: true } },
      },
    }),
  ]);

  const triggerOptions = Object.values(DomainEventType);

  return (
    <>
      <AdminPageHeader
        title="اتوماسیون CRM"
        description="قوانین امن و قابل‌پیکربندی — بدون کد دلخواه، SQL یا دستور سرور. پیش‌فرض‌ها فقط قالب هستند."
        breadcrumbs={[...adminBreadcrumbs.automations]}
        compact
      />

      <section className="admin-card mb-6 px-5 py-5">
        <h2 className="mb-3 font-bold text-primary">پیش‌فرض‌های آماده</h2>
        <ul className="space-y-3">
          {AUTOMATION_PRESETS.map((preset) => (
            <li key={preset.code} className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
              <div>
                <p className="font-medium text-primary">{preset.name}</p>
                <p className="text-sm text-muted">{preset.description}</p>
                <p className="mt-1 text-xs text-muted" dir="ltr">{preset.trigger}</p>
              </div>
              <form action={createAutomationFromPresetAction}>
                <input type="hidden" name="presetCode" value={preset.code} />
                <button type="submit" className="rounded-lg border border-border px-3 py-2 text-sm">
                  ایجاد (غیرفعال)
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section className="admin-card mb-6 px-5 py-5">
        <h2 className="mb-3 font-bold text-primary">قانون جدید</h2>
        <form action={createAutomationRuleAction} className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block text-muted">نام</span>
            <input name="name" required className="w-full rounded-lg border border-border px-3 py-2" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted">تریگر</span>
            <select name="trigger" className="w-full rounded-lg border border-border px-3 py-2" dir="ltr">
              {triggerOptions.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted">فرم (اختیاری)</span>
            <select name="formId" className="w-full rounded-lg border border-border px-3 py-2">
              <option value="">—</option>
              {forms.map((f) => (
                <option key={f.id} value={f.id}>{f.slug}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted">خدمت رزرو (اختیاری)</span>
            <select name="bookingServiceId" className="w-full rounded-lg border border-border px-3 py-2">
              <option value="">—</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block text-muted">اکشن‌ها (JSON امن)</span>
            <textarea
              name="actionsJson"
              rows={4}
              dir="ltr"
              defaultValue={JSON.stringify(
                {
                  actions: [
                    { type: "CREATE_TASK", title: "پیگیری", taskType: "FOLLOW_UP", dueMinutes: 60 },
                  ],
                },
                null,
                2,
              )}
              className="w-full rounded-lg border border-border px-3 py-2 font-mono text-xs"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block text-muted">شرایط (JSON امن)</span>
            <textarea
              name="conditionsJson"
              rows={3}
              dir="ltr"
              defaultValue="{}"
              className="w-full rounded-lg border border-border px-3 py-2 font-mono text-xs"
            />
          </label>
          <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm text-white sm:col-span-2">
            ایجاد قانون (غیرفعال تا فعال‌سازی دستی)
          </button>
        </form>
      </section>

      <section className="admin-card mb-6 px-5 py-5">
        <h2 className="mb-3 font-bold text-primary">قوانین</h2>
        {rules.length === 0 ? (
          <AdminEmptyState
            title="قانونی تعریف نشده"
            description="از پیش‌فرض‌ها یک قانون بسازید، سپس آن را فعال کنید."
          />
        ) : (
          <ul className="divide-y divide-border">
            {rules.map((rule) => (
              <li key={rule.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium text-primary">{rule.name}</p>
                  <p className="text-xs text-muted" dir="ltr">
                    {rule.trigger} · {rule.isEnabled ? "enabled" : "disabled"}
                  </p>
                </div>
                <form action={toggleAutomationRuleAction}>
                  <input type="hidden" name="ruleId" value={rule.id} />
                  <input type="hidden" name="enabled" value={rule.isEnabled ? "0" : "1"} />
                  <button type="submit" className="rounded-lg border border-border px-3 py-2 text-sm">
                    {rule.isEnabled ? "غیرفعال کردن" : "فعال کردن"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="admin-card mb-6 px-5 py-5">
        <h2 className="mb-3 font-bold text-primary">آمار اجرا</h2>
        <ul className="flex flex-wrap gap-3 text-sm">
          {execStats.map((row) => (
            <li key={row.status} className="rounded-lg border border-border px-3 py-2">
              {row.status}: {toPersianDigits(row._count._all)}
            </li>
          ))}
          {execStats.length === 0 ? <li className="text-muted">هنوز اجرایی ثبت نشده</li> : null}
        </ul>
      </section>

      <section className="admin-card px-5 py-5">
        <h2 className="mb-3 font-bold text-primary">اجراهای ناموفق</h2>
        {failedExecs.length === 0 ? (
          <p className="text-sm text-muted">موردی نیست.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {failedExecs.map((row) => (
              <li key={row.id} className="border-b border-border/60 pb-2">
                <p className="font-medium">{row.automationRule.name}</p>
                <p className="text-xs text-muted">
                  {row.status}
                  {row.errorCode ? ` · ${row.errorCode}` : ""}
                  {row.lastError ? ` · ${row.lastError}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
