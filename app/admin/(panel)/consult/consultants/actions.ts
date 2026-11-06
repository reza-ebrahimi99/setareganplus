"use server";

import { redirect } from "next/navigation";
import { requirePerm, logAction } from "@/lib/auth";
import { b, imageField, n, s, sn } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { jalaliToTehranKey, hmToMinutes } from "@/lib/consult/time";

function back(id: string, error?: string): never {
  redirect(error ? `/admin/consult/consultants/${id}?e=${encodeURIComponent(error)}` : "/admin/consult/consultants?ok=1");
}

function hm(value: string): string | null {
  const raw = value.trim();
  if (!/^\d{2}:\d{2}$/.test(raw)) return null;
  return hmToMinutes(raw) === null ? null : raw;
}

export async function saveConsultant(fd: FormData) {
  const me = await requirePerm("consult.consultants");
  const id = s(fd, "id");
  const isNew = id === "new";
  const current = isNew ? null : await prisma.consultant.findUnique({ where: { id } });
  if (!isNew && !current) redirect("/admin/consult/consultants");
  const name = s(fd, "name");
  const specialty = s(fd, "specialty");
  if (name.length < 2) back(id, "نام مشاور را بنویسید.");
  if (!specialty) back(id, "تخصص را بنویسید. نام و تخصص ساختگی از طرف سایت گذاشته نمی‌شود.");
  const data = {
    name: name.slice(0, 80),
    specialty: specialty.slice(0, 120),
    bio: sn(fd, "bio"),
    photo: await imageField(fd, "photo", current?.photo ?? null, "consultants", 960),
    offersPublic: b(fd, "offersPublic"),
    offersSpecial: b(fd, "offersSpecial"),
    offersOnline: b(fd, "offersOnline"),
    offersInPerson: b(fd, "offersInPerson"),
    active: b(fd, "active"),
    sortOrder: n(fd, "sortOrder"),
  };
  if (isNew) {
    const created = await prisma.consultant.create({ data });
    await logAction(me, "consult.consultant", `مشاور جدید: ${data.name}`, created.id);
    redirect(`/admin/consult/consultants/${created.id}?ok=1`);
  }
  await prisma.consultant.update({ where: { id }, data });
  await logAction(me, "consult.consultant", `ویرایش مشاور: ${data.name}`, id);
  redirect(`/admin/consult/consultants/${id}?ok=1`);
}

export async function removeConsultant(fd: FormData) {
  const me = await requirePerm("consult.consultants");
  const id = s(fd, "id");
  const count = await prisma.consultation.count({ where: { consultantId: id } });
  if (count > 0) back(id, "این مشاور نوبت دارد. به‌جای حذف، غیرفعالش کنید.");
  await prisma.consultant.delete({ where: { id } });
  await logAction(me, "consult.consultant", "حذف مشاور بدون نوبت", id);
  redirect("/admin/consult/consultants?ok=1");
}

export async function addWindow(fd: FormData) {
  await requirePerm("consult.consultants");
  const id = s(fd, "consultantId");
  const weekday = Number(s(fd, "weekday"));
  const startTime = hm(s(fd, "startTime"));
  const endTime = hm(s(fd, "endTime"));
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6 || !startTime || !endTime || hmToMinutes(endTime)! <= hmToMinutes(startTime)!) {
    back(id, "بازهٔ هفتگی نامعتبر است.");
  }
  const online = b(fd, "online");
  const inPerson = b(fd, "inPerson");
  if (!online && !inPerson) back(id, "حداقل آنلاین یا حضوری را برای این بازه انتخاب کنید.");
  const audience = s(fd, "audience");
  const slotRaw = s(fd, "slotMinutes");
  const capRaw = s(fd, "capacity");
  const slotMinutes = slotRaw ? Number(slotRaw) : null;
  const capacity = capRaw ? Number(capRaw) : null;
  if (slotMinutes !== null && (!Number.isInteger(slotMinutes) || slotMinutes < 10 || slotMinutes > 180)) back(id, "طول نوبت باید بین ۱۰ تا ۱۸۰ دقیقه باشد، یا خالی بماند.");
  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1 || capacity > 20)) back(id, "ظرفیت باید بین ۱ تا ۲۰ باشد، یا خالی بماند تا یک نفر حساب شود.");
  await prisma.consultantWindow.create({
    data: {
      consultantId: id,
      weekday,
      startTime: startTime!,
      endTime: endTime!,
      slotMinutes,
      capacity,
      online,
      inPerson,
      audience: audience === "PUBLIC" || audience === "SPECIAL" ? audience : "BOTH",
    },
  });
  redirect(`/admin/consult/consultants/${id}?ok=1`);
}

export async function deleteWindow(fd: FormData) {
  await requirePerm("consult.consultants");
  const id = s(fd, "consultantId");
  await prisma.consultantWindow.delete({ where: { id: s(fd, "windowId") } });
  redirect(`/admin/consult/consultants/${id}?ok=1`);
}

export async function addException(fd: FormData) {
  await requirePerm("consult.consultants");
  const id = s(fd, "consultantId");
  const jy = Number(s(fd, "jy"));
  const jm = Number(s(fd, "jm"));
  const jd = Number(s(fd, "jd"));
  const date = jalaliToTehranKey(jy, jm, jd);
  if (!date) back(id, "تاریخ شمسی درست نیست.");
  const kind = s(fd, "kind") === "EXTRA" ? "EXTRA" : "OFF";
  const startRaw = s(fd, "startTime");
  const endRaw = s(fd, "endTime");
  const startTime = startRaw ? hm(startRaw) : null;
  const endTime = endRaw ? hm(endRaw) : null;
  if ((startRaw || endRaw) && (!startTime || !endTime || hmToMinutes(endTime)! <= hmToMinutes(startTime)!)) back(id, "ساعت شروع و پایان استثنا را هر دو بنویسید.");
  if (kind === "EXTRA" && (!startTime || !endTime)) back(id, "روز اضافه بدون ساعت باز نمی‌شود.");
  let online = b(fd, "online");
  let inPerson = b(fd, "inPerson");
  if (!online && !inPerson) {
    if (kind === "OFF") {
      online = true;
      inPerson = true;
    } else back(id, "برای ساعت اضافه، آنلاین یا حضوری را انتخاب کنید.");
  }
  const audience = s(fd, "audience");
  const slotRaw = s(fd, "slotMinutes");
  const capRaw = s(fd, "capacity");
  await prisma.consultantException.create({
    data: {
      consultantId: id,
      date: date!,
      kind,
      startTime,
      endTime,
      online,
      inPerson,
      audience: audience === "PUBLIC" || audience === "SPECIAL" ? audience : "BOTH",
      slotMinutes: slotRaw ? Number(slotRaw) : null,
      capacity: capRaw ? Number(capRaw) : null,
      note: sn(fd, "note"),
    },
  });
  redirect(`/admin/consult/consultants/${id}?ok=1`);
}

export async function deleteException(fd: FormData) {
  await requirePerm("consult.consultants");
  const id = s(fd, "consultantId");
  await prisma.consultantException.delete({ where: { id: s(fd, "exceptionId") } });
  redirect(`/admin/consult/consultants/${id}?ok=1`);
}
