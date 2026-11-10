import { requirePerm } from "@/lib/auth";
import { PageTitle, Panel, Area, Flash } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { importQuestions } from "../actions";

const SAMPLE = `{
  "source": "qbank",
  "questions": [
    {
      "externalId": "qb-sample-1",
      "lessonHash": "HASH",
      "prompt": "اگر $f(x)=x^2$ باشد، $f(2)$ کدام است؟",
      "explanation": "چون $2^2=4$.",
      "choices": [
        { "text": "$4$", "correct": true },
        { "text": "$2$", "correct": false },
        { "text": "$8$", "correct": false }
      ]
    }
  ]
}`;

export default async function ImportPage({ searchParams }: { searchParams: Promise<{ ok?: string; skip?: string; e?: string }> }) {
  await requirePerm("classes.manage");
  const sp = await searchParams;
  return (
    <>
      <PageTitle title="ورود سؤال از بانک" sub="همین قالب را qbank.setareganplus.ir بعداً می‌فرستد. سؤال‌ها با externalId به‌روز می‌شوند و به جلسه با lessonHash می‌چسبند." />
      <Flash ok={sp.ok ? "1" : undefined} />
      {sp.ok && <p className="mb-3 text-sm">ذخیره شد: {sp.ok} · رد شد: {sp.skip || "0"}</p>}
      {sp.e && <p className="mb-3 text-sm text-red-700">{sp.e === "json" ? "JSON خوانده نشد." : sp.e}</p>}
      <Panel>
        <form action={importQuestions} className="space-y-3">
          <Area label="JSON" name="json" rows={14} dir="ltr" defaultValue={SAMPLE} />
          <label className="block text-sm">یا فایل <input type="file" name="file" accept="application/json" /></label>
          <SubmitButton>ورود</SubmitButton>
        </form>
      </Panel>
    </>
  );
}
