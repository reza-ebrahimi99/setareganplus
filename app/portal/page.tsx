import { redirect } from "next/navigation";
import {
  readActivePortalLinkCookie,
  requirePortalContext,
} from "@/lib/portal/auth";
import { headers } from "next/headers";
import { resolvePortalHubPath } from "@/lib/guidance/student-entry";

export const dynamic = "force-dynamic";

export default async function PortalHomePage() {
  const context = await requirePortalContext();
  const preferred = await readActivePortalLinkCookie();

  if (context.links.length > 1 && !preferred) {
    redirect("/portal/select-account");
  }

  const host = (await headers()).get("host");
  redirect(await resolvePortalHubPath(context, { host }));
}
