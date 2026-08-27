import { notFound } from "next/navigation";
import { isSxpEnabled } from "@/lib/sxp/flags";

export async function assertSxpEnabledOrNotFound(
  organizationId: string,
): Promise<void> {
  const enabled = await isSxpEnabled(organizationId);
  if (!enabled) notFound();
}
