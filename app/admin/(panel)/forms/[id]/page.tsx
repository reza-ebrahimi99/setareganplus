import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePerm } from "@/lib/auth";
import { parseFields, FIELD_TYPES, type FieldDef } from "@/lib/forms/types";
import { slugify } from "@/lib/format";
import { FormBuilder, type BuilderPayload } from "@/components/admin/FormBuilder";

export default async function FormEdit({ params }: { params: Promise<{ id: string }> }) {
  await requirePerm("forms.builder");
  const { id } = await params;
  const f = await prisma.form.findUnique({ where: { id }, include: { _count: { select: { submissions: true } } } });
  if (!f) notFound();

  async function save(p: BuilderPayload): Promise<{ ok: boolean; error?: string }> {
    "use server";
    await requirePerm("forms.builder");
    if (!["DRAFT", "PUBLISHED", "CLOSED"].includes(p.status)) return { ok: false, error: "وضعیت نامعتبر است." };
    const valid = new Set<string>(FIELD_TYPES.map((t) => t.type));
    const ids = new Set<string>();
    const fields: FieldDef[] = [];
    for (const x of p.fields) {
      if (!valid.has(x.type) || !x.id || ids.has(x.id)) return { ok: false, error: "ساختار فیلدها نامعتبر است." };
      if (!x.label.trim()) return { ok: false, error: "همه فیلدها باید عنوان داشته باشند." };
      if (["select", "radio"].includes(x.type) && !(x.options ?? []).filter(Boolean).length) return { ok: false, error: `برای «${x.label}» حداقل یک گزینه لازم است.` };
      ids.add(x.id);
      fields.push({
        id: x.id,
        type: x.type,
        label: x.label.trim(),
        help: x.help?.trim() || undefined,
        placeholder: x.placeholder?.trim() || undefined,
        required: !!x.required,
        half: !!x.half,
        options: x.options?.map((o) => o.trim()).filter(Boolean),
        showIf: x.showIf?.field && x.showIf.equals ? x.showIf : null,
      });
    }
    const slug = slugify(p.slug);
    const clash = await prisma.form.findFirst({ where: { slug, NOT: { id } } });
    if (clash) return { ok: false, error: "این نامک قبلاً استفاده شده است." };
    const cur = await prisma.form.findUnique({ where: { id } });
    await prisma.form.update({
      where: { id },
      data: {
        title: p.title.trim() || "فرم",
        slug: cur?.isSystem ? cur.slug : slug,
        description: p.description.trim() || null,
        status: p.status,
        submitLabel: p.submitLabel.trim() || "ارسال",
        successMessage: p.successMessage.trim() || "ثبت شد.",
        fields,
      },
    });
    return { ok: true };
  }
  async function remove() {
    "use server";
    await requirePerm("forms.builder");
    const cur = await prisma.form.findUnique({ where: { id } });
    if (cur?.isSystem) return;
    await prisma.form.delete({ where: { id } });
    redirect("/admin/forms");
  }

  return (
    <FormBuilder
      id={f.id}
      isSystem={f.isSystem}
      submissions={f._count.submissions}
      initial={{
        title: f.title,
        slug: f.slug,
        description: f.description ?? "",
        status: f.status,
        submitLabel: f.submitLabel,
        successMessage: f.successMessage,
        fields: parseFields(f.fields),
      }}
      save={save}
      remove={f.isSystem ? undefined : remove}
    />
  );
}
