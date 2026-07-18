import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { revokePortalSessionCookie } from "@/lib/portal/auth";

export async function POST(request: NextRequest) {
  await revokePortalSessionCookie();
  const loginUrl = new URL("/portal/login", request.url);
  return NextResponse.redirect(loginUrl);
}
