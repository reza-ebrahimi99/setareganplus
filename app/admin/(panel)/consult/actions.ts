"use server";

import { redirect } from "next/navigation";
import { requirePerm, logAction } from "@/lib/auth";
import { s, sn } from "@/lib/admin";
import { cancelConsultation, confirmConsultation, rescheduleConsultation } from "@/lib/consult/manage";
import { queueAndSend, resendNotice } from "@/lib/consult/notify";
import type { ConsultMode } from "@/lib/consult/constants";

export async function confirm(fd: FormData) {
  const me = await requirePerm("consult.manage");
  const id = s(fd, "id");
  const res = await confirmConsultation(id);
  if (!res.ok) redirect(`/admin/consult/${id}?e=${encodeURIComponent(res.error)}`);
  if (fd.get("notify") === "on") await queueAndSend(id, "CREATED").catch(() => undefined);
  await logAction(me, "consult.confirm", "تأیید نوبت مشاوره", id);
  redirect(`/admin/consult/${id}?ok=1`);
}

export async function cancel(fd: FormData) {
  const me = await requirePerm("consult.manage");
  const id = s(fd, "id");
  const res = await cancelConsultation(id, sn(fd, "reason"), fd.get("notify") === "on");
  if (!res.ok) redirect(`/admin/consult/${id}?e=${encodeURIComponent(res.error)}`);
  await logAction(me, "consult.cancel", "لغو نوبت مشاوره", id);
  redirect(`/admin/consult/${id}?ok=1`);
}

export async function move(fd: FormData) {
  const me = await requirePerm("consult.manage");
  const id = s(fd, "id");
  const raw = s(fd, "slot");
  const [consultantId, startsAt, mode] = raw.split("|");
  if (!consultantId || !startsAt || (mode !== "ONLINE" && mode !== "IN_PERSON")) redirect(`/admin/consult/${id}?e=${encodeURIComponent("یک زمان واقعی را انتخاب کنید.")}`);
  const res = await rescheduleConsultation(id, startsAt, consultantId, mode as ConsultMode, fd.get("notify") === "on");
  if (!res.ok) redirect(`/admin/consult/${id}?e=${encodeURIComponent(res.error)}`);
  await logAction(me, "consult.move", "جابه‌جایی نوبت مشاوره", id);
  redirect(`/admin/consult/${id}?ok=1`);
}

export async function resend(fd: FormData) {
  await requirePerm("consult.manage");
  const id = s(fd, "booking");
  const noticeId = s(fd, "notice");
  await resendNotice(noticeId);
  redirect(`/admin/consult/${id}?ok=1`);
}
