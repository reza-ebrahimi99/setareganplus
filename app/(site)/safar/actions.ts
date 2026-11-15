"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { continueJourney, startJourney, submitKey } from "@/lib/journey/store";

async function ip() {
  const h = await headers();
  return (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || h.get("x-real-ip") || "";
}

export async function beginJourney(formData: FormData) {
  const grade = Number(formData.get("grade"));
  const res = await startJourney({
    name: String(formData.get("name") ?? ""),
    mobile: String(formData.get("mobile") ?? ""),
    parentMobile: String(formData.get("parent") ?? ""),
    grade,
    field: String(formData.get("field") ?? ""),
    school: String(formData.get("school") ?? ""),
    ip: await ip(),
  });
  if (!res.ok) redirect(`/safar?e=${encodeURIComponent(res.error)}`);
  redirect("/safar/map");
}

export async function pickKey(formData: FormData) {
  const res = await submitKey(String(formData.get("option") ?? ""));
  if (!res.ok) redirect(`/safar/go?e=${encodeURIComponent(res.error)}`);
  redirect(res.href);
}

export async function goOn() {
  const res = await continueJourney();
  if (!res.ok) redirect(`/safar?e=${encodeURIComponent(res.error)}`);
  redirect(res.href);
}
