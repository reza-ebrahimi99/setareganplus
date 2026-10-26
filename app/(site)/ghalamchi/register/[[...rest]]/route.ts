import { prisma } from "@/lib/prisma";

/**
 * Old site's online registration (/ghalamchi/register, /ghalamchi/register/wizard, …).
 * Send visitors to the live Ghalamchi exam form when it is published, otherwise to the
 * pre-registration form on the Ghalamchi page — never to the home page.
 * (Old receipts /ghalamchi/register/receipt/* are still proxied to the old app by nginx.)
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const live = await prisma.form
    .findFirst({ where: { slug: "ghalamchi-exam", status: "PUBLISHED" }, select: { slug: true } })
    .catch(() => null);
  const to = live ? "/f/ghalamchi-exam" : "/ghalamchi#register";
  return new Response(null, { status: 307, headers: { Location: to, "Cache-Control": "no-store" } });
}
