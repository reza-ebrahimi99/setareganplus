"use server";

import { redirect } from "next/navigation";
import { SPECIAL_PATH } from "@/lib/consult/constants";
import { clearStudentCookie, requestIp, verifyStudentCode } from "@/lib/consult/students";

export async function enterWithCode(code: string) {
  return verifyStudentCode(code, await requestIp());
}

export async function leaveSpecial() {
  await clearStudentCookie();
  redirect(SPECIAL_PATH);
}
