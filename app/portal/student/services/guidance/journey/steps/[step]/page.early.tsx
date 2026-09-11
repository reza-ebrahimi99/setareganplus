/**
 * Local stub for steps 1–10. Production apply script replaces this with the
 * original V2 dispatcher (renamed from page.tsx). Do not pack this stub.
 */

import { notFound } from "next/navigation";
import type { ReactElement } from "react";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ step: string }> };

export default async function GuidanceV2EarlyStepsStub(_props: Props): Promise<ReactElement> {
  notFound();
}
