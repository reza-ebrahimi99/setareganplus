import { notFound } from "next/navigation";
import { isSxpEnabled, isSxpFilesEnabled } from "@/lib/sxp/flags";

export async function assertSxpEnabledOrNotFound(
  organizationId: string,
): Promise<void> {
  const enabled = await isSxpEnabled(organizationId);
  if (!enabled) notFound();
}

export async function assertSxpFilesEnabledOrNotFound(
  organizationId: string,
): Promise<void> {
  const enabled = await isSxpFilesEnabled(organizationId);
  if (!enabled) notFound();
}
