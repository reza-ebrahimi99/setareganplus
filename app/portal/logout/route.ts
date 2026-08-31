import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { revokePortalSessionCookie } from "@/lib/portal/auth";
import {
  OFFICE_LOGOUT_NEXT,
  PORTAL_LOGOUT_NEXT,
  resolveRelativePath,
} from "@/lib/guidance/office/relative-url";

function logoutPath(request: NextRequest, formNext: string | null): string {
  const fromQuery = request.nextUrl.searchParams.get("next");
  const referer = request.headers.get("referer") ?? "";
  const fromOffice =
    referer.includes("/ms") || fromQuery === OFFICE_LOGOUT_NEXT;
  const fallback = fromOffice ? OFFICE_LOGOUT_NEXT : PORTAL_LOGOUT_NEXT;
  return resolveRelativePath(formNext ?? fromQuery, fallback);
}

function relativeRedirect(path: string, request: NextRequest) {
  const response = NextResponse.redirect(new URL(path, request.url), 303);
  response.headers.set("Location", path);
  return response;
}

export async function POST(request: NextRequest) {
  await revokePortalSessionCookie();
  let formNext: string | null = null;
  try {
    const form = await request.formData();
    const value = form.get("next");
    formNext = typeof value === "string" ? value : null;
  } catch {
    formNext = null;
  }
  return relativeRedirect(logoutPath(request, formNext), request);
}

export async function GET(request: NextRequest) {
  await revokePortalSessionCookie();
  return relativeRedirect(logoutPath(request, null), request);
}
