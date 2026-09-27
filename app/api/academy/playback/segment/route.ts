import { NextResponse } from "next/server";
import { createReadStream } from "node:fs";
import path from "node:path";
import { getAcademyOrganizationId } from "@/lib/academy/config";
import { resolvePlaybackSessionByToken } from "@/lib/academy/playback";
import { resolveAcademyVideoAbsolutePath } from "@/lib/academy/storage/video";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  const sessionId = url.searchParams.get("session") ?? "";
  const file = url.searchParams.get("file") ?? "";
  if (!token || !sessionId || !file || file.includes("..")) {
    return new NextResponse("Bad request", { status: 400 });
  }

  const organizationId = await getAcademyOrganizationId();
  const session = await resolvePlaybackSessionByToken({
    organizationId,
    sessionId,
    playbackToken: token,
  });

  const prefix = session?.lesson.videoAsset?.hlsStoragePrefix;
  if (!prefix) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const storageKey = path.posix.join(prefix, path.basename(file));
  const absolute = resolveAcademyVideoAbsolutePath(storageKey);
  const stream = createReadStream(absolute);
  return new NextResponse(stream as unknown as BodyInit, {
    headers: {
      "Content-Type": "video/mp2t",
      "Cache-Control": "private, no-store",
    },
  });
}
