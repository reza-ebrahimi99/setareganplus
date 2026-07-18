"use server";

import { redirect } from "next/navigation";
import { PortalAccountType } from "@/generated/prisma/enums";
import {
  requirePortalContext,
  setActivePortalLinkCookie,
} from "@/lib/portal/auth";
import { logServerInfo } from "@/lib/observability/server-log";

export async function selectPortalAccountAction(formData: FormData) {
  const linkId = formData.get("linkId");
  if (typeof linkId !== "string" || !linkId.trim()) {
    redirect("/portal/select-account");
  }

  const context = await requirePortalContext();
  const link = context.links.find((row) => row.id === linkId);
  if (!link) {
    redirect("/portal/select-account");
  }

  await setActivePortalLinkCookie(link.id);
  logServerInfo({
    module: "portal.auth",
    action: "selectPortalAccount",
    category: "security",
    organizationId: context.organization.id,
    userId: context.user.id,
    recordId: link.id,
    message: "portal_account_context_switch",
    meta: { accountType: link.accountType },
  });

  redirect(
    link.accountType === PortalAccountType.STUDENT
      ? "/portal/student"
      : "/portal/parent",
  );
}
