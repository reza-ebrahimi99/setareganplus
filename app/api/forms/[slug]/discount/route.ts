import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { allow } from "@/lib/shop/ratelimit";
import { findDiscount } from "@/lib/forms/registration";

/** Checks a discount code for the live total. The amount is re-checked on submit. */
export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  if (!allow(`fdisc:${ip}`, 20, 10 * 60_000)) return NextResponse.json({ error: "تعداد تلاش‌ها زیاد است؛ کمی بعد دوباره امتحان کنید." }, { status: 429 });
  const form = await prisma.form.findUnique({ where: { slug }, select: { id: true, status: true, payMode: true } });
  if (!form || form.status !== "PUBLISHED" || form.payMode === "FREE") return NextResponse.json({ error: "این فرم کد تخفیف ندارد." }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { code?: string };
  const r = await findDiscount(form.id, String(body.code ?? "").slice(0, 40));
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 422 });
  return NextResponse.json({ code: r.d.code, percent: r.d.percent ?? null, amountRials: r.d.amountRials ?? null });
}
