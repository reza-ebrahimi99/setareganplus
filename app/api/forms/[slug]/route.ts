import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseFields, type FormValues } from "@/lib/forms/types";
import { isVisible, validateValues } from "@/lib/forms/validate";
import { savePrivateFile } from "@/lib/uploads";

// naive in-memory rate limit: 8 submissions / 10 min / IP
const hits = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > 8;
}

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const form = await prisma.form.findUnique({ where: { slug } });
  if (!form || form.status !== "PUBLISHED") return NextResponse.json({ error: "این فرم فعال نیست." }, { status: 404 });

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  if (limited(ip)) return NextResponse.json({ error: "تعداد درخواست‌ها زیاد است؛ چند دقیقه بعد تلاش کنید." }, { status: 429 });

  let fd: FormData;
  try {
    fd = await req.formData();
  } catch {
    return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 400 });
  }
  if (fd.get("__hp")) return NextResponse.json({ message: form.successMessage }); // bot

  let values: FormValues = {};
  try {
    const raw = JSON.parse(String(fd.get("__values") ?? "{}"));
    if (raw && typeof raw === "object") values = raw;
  } catch {
    return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 400 });
  }

  const fields = parseFields(form.fields);
  const known = new Set(fields.map((f) => f.id));
  for (const k of Object.keys(values)) if (!known.has(k)) delete values[k];

  const errors = validateValues(fields, values);
  const data: Record<string, unknown> = { ...values };
  for (const f of fields.filter((x) => x.type === "file")) {
    if (!isVisible(f, values)) continue;
    const file = fd.get(`file_${f.id}`);
    if (file instanceof File && file.size > 0) {
      try {
        data[f.id] = await savePrivateFile(file);
      } catch (e) {
        errors[f.id] = (e as Error).message;
      }
    } else if (f.required) errors[f.id] = "بارگذاری فایل الزامی است.";
  }
  if (Object.keys(errors).length) return NextResponse.json({ error: "لطفاً خطاهای فرم را برطرف کنید.", errors }, { status: 422 });

  await prisma.submission.create({
    data: {
      formId: form.id,
      data: data as object,
      labels: Object.fromEntries(fields.map((f) => [f.id, f.label])),
    },
  });
  return NextResponse.json({ message: form.successMessage });
}
