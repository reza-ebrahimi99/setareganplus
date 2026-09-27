import { NextResponse } from "next/server";
import { createReadStream, promises as fs } from "node:fs";
import { getAcademyOrganizationId } from "@/lib/academy/config";
import { resolvePlaybackSessionByToken } from "@/lib/academy/playback";
import { resolveAcademyVideoAbsolutePath } from "@/lib/academy/storage/video";

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

  if (!session?.lesson.videoAsset?.storageKey) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const absolute = resolveAcademyVideoAbsolutePath(
    session.lesson.videoAsset.storageKey,
  );
  const stat = await fs.stat(absolute);
  const range = request.headers.get("range");

  if (range) {
    const match = /^bytes=(\d+)-(\d*)$/.exec(range);
    if (match) {
      const start = Number.parseInt(match[1]!, 10);
      const end = match[2]
        ? Number.parseInt(match[2], 10)
        : stat.size - 1;
      const chunkSize = end - start + 1;
      const stream = createReadStream(absolute, { start, end });
      return new NextResponse(stream as unknown as BodyInit, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${stat.size}`,
          "Accept-Ranges": "bytes",
          "Content-Length": String(chunkSize),
          "Content-Type": "video/mp4",
          "Cache-Control": "private, no-store",
        },
      });
    }
  }

  const stream = createReadStream(absolute);
  return new NextResponse(stream as unknown as BodyInit, {
    headers: {
      "Content-Length": String(stat.size),
      "Content-Type": "video/mp4",
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, no-store",
    },
  });
}
