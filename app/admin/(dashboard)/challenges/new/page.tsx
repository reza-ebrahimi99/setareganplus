import { createChallengeCampaignAction } from "@/app/admin/(dashboard)/challenges/actions";
import { ChallengeActionForm } from "@/components/admin/challenge/ChallengeActionForm";
import { requirePermission } from "@/lib/auth/require-admin";

export default async function NewChallengeCampaignPage() {
  await requirePermission("challenges.manage");
  return (
    <div className="mx-auto max-w-3xl space-y-6" dir="rtl">
      <div><h1 className="text-2xl font-bold">کمپین جدید</h1><p className="mt-1 text-sm text-muted">ابتدا مشخصات پایه را بسازید؛ سپس آزمون و جوایز را اضافه کنید.</p></div>
      <ChallengeActionForm
        action={createChallengeCampaignAction}
        className="space-y-5 rounded-xl border bg-surface p-6"
        submitLabel="ساخت کمپین و ادامه"
        pendingLabel="در حال ساخت کمپین…"
      >
        <label className="block text-sm font-medium">عنوان<input name="title" required defaultValue="چالش ۵ نفره ریاضی" className="mt-2 w-full rounded-lg border px-3 py-2" /></label>
        <label className="block text-sm font-medium">شناسه انگلیسی<input name="slug" dir="ltr" defaultValue="math-five" pattern="[a-z0-9-]+" className="mt-2 w-full rounded-lg border px-3 py-2 text-left" /></label>
        <label className="block text-sm font-medium">برچسب بالای صفحه<input name="eyebrow" defaultValue="چالش گروهی ستارگان" className="mt-2 w-full rounded-lg border px-3 py-2" /></label>
        <label className="block text-sm font-medium">خلاصه<textarea name="summary" rows={3} defaultValue="چهار دوستت را دعوت کن، آزمون ریاضی را بدهید و نتیجه تیم را با هم باز کنید." className="mt-2 w-full rounded-lg border px-3 py-2" /></label>
        <label className="block text-sm font-medium">توضیحات<textarea name="description" rows={4} defaultValue="یک تجربه گروهی برای سنجش مهارت ریاضی، دریافت جایزه و گواهی معتبر." className="mt-2 w-full rounded-lg border px-3 py-2" /></label>
      </ChallengeActionForm>
    </div>
  );
}
