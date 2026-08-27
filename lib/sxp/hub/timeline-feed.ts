import { NextResponse } from "next/server";
import { PortalAccountType } from "@/generated/prisma/enums";
import { resolvePortalContext } from "@/lib/portal/auth";
import { isSxpEnabled } from "@/lib/sxp/flags";
import { loadExperienceTimeline } from "@/lib/sxp/hub/load-timeline";

export async function handleExperienceTimelineFeed(params: {
  request: Request;
  accountType: PortalAccountType;
  feedHref: string;
}): Promise<NextResponse> {
  const context = await resolvePortalContext();
  if (!context) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (context.activeLink.accountType !== params.accountType) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!(await isSxpEnabled(context.organization.id))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const url = new URL(params.request.url);
  const timeline = await loadExperienceTimeline({
    context,
    feedHref: params.feedHref,
    q: url.searchParams.get("q"),
    type: url.searchParams.get("type"),
    cursor: url.searchParams.get("cursor"),
  });

  return NextResponse.json({
    groups: timeline.groups,
    nextCursor: timeline.nextCursor,
  });
}
