import { NextResponse } from "next/server";
import { AcademyVideoAssetStatus } from "@/generated/prisma/enums";
import { getAcademyOrganizationId } from "@/lib/academy/config";
import { resolvePlaybackSessionByToken } from "@/lib/academy/playback";
import { resolveAcademyVideoAbsolutePath } from "@/lib/academy/storage/video";
import { promises as fs } from "node:fs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  const sessionId = url.searchParams.get("session") ?? "";
  if (!token || !sessionId) {
    return new NextResponse("Bad request", { status: 400 });
  }

  const organizationId = await getAcademyOrganizationId();
  const session = await resolvePlaybackSessionByToken({
    organizationId,
    sessionId,
    playbackToken: token,
  });

  if (!session?.lesson.videoAsset) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const asset = session.lesson.videoAsset;
  if (asset.status !== AcademyVideoAssetStatus.READY) {
    return new NextResponse("Not ready", { status: 409 });
  }

  if (asset.hlsStoragePrefix) {
    const masterKey = `${asset.hlsStoragePrefix}/master.m3u8`;
    try {
      const absolute = resolveAcademyVideoAbsolutePath(masterKey);
      const playlist = await fs.readFile(absolute, "utf8");
      const rewritten = playlist.replace(
        /^([^#\n][^\n]*\.ts)$/gm,
        (seg) =>
          `/api/academy/playback/segment?token=${encodeURIComponent(token)}&session=${encodeURIComponent(sessionId)}&file=${encodeURIComponent(seg.trim())}`,
      );
      return new NextResponse(rewritten, {
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "private, no-store",
        },
      });
    } catch {
      // fall through to MP4 progressive
    }
  }

  const streamUrl = `/api/academy/playback/stream?token=${encodeURIComponent(token)}&session=${encodeURIComponent(sessionId)}`;
  return NextResponse.redirect(new URL(streamUrl, request.url));
}

export async function HEAD(request: Request) {
  return GET(request);
}
