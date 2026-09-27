"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { maskIranianMobile } from "@/lib/academy/money";

const DEVICE_KEY_STORAGE = "academy_device_key";

function getOrCreateDeviceKey(): string {
  if (typeof window === "undefined") return "";
  let key = localStorage.getItem(DEVICE_KEY_STORAGE);
  if (!key) {
    key = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY_STORAGE, key);
  }
  return key;
}

type Props = {
  lessonId: string;
  courseId: string;
  userId: string;
  initialPosition: number;
  watermarkLabel: string;
  watermarkMobile: string | null;
};

export function AcademyVideoPlayer(props: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [wmPos, setWmPos] = useState(0);

  const positions = [
    "top-4 left-4",
    "top-4 right-4",
    "bottom-16 left-4",
    "bottom-16 right-4",
    "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setWmPos((p) => (p + 1) % positions.length);
    }, 25_000 + Math.random() * 15_000);
    return () => clearInterval(interval);
  }, [positions.length]);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/academy/playback/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: props.lessonId,
          deviceKey: getOrCreateDeviceKey(),
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        manifestUrl?: string;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.manifestUrl) {
        setError(data.error ?? "خطا در شروع پخش");
        return;
      }
      const video = videoRef.current;
      if (!video) return;
      video.src = data.manifestUrl;
      if (props.initialPosition > 0) {
        video.currentTime = props.initialPosition;
      }
    } catch {
      setError("اتصال برقرار نشد.");
    } finally {
      setLoading(false);
    }
  }, [props.initialPosition, props.lessonId]);

  useEffect(() => {
    let cancelled = false;
    // Playback bootstrap is async (fetch + video element); runs once on mount.
    void (
      // eslint-disable-next-line react-hooks/set-state-in-effect -- setState only after await in bootstrap()
      bootstrap().finally(() => {
        if (cancelled) return;
      })
    );
    return () => {
      cancelled = true;
    };
  }, [bootstrap]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let lastSent = 0;
    const sendProgress = () => {
      const now = Date.now();
      if (now - lastSent < 12_000) return;
      lastSent = now;
      void fetch("/api/academy/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: props.courseId,
          lessonId: props.lessonId,
          lastPositionSeconds: video.currentTime,
          durationSeconds: video.duration || null,
        }),
      });
    };

    video.addEventListener("timeupdate", sendProgress);
    video.addEventListener("pause", sendProgress);
    video.addEventListener("ended", sendProgress);
    return () => {
      video.removeEventListener("timeupdate", sendProgress);
      video.removeEventListener("pause", sendProgress);
      video.removeEventListener("ended", sendProgress);
    };
  }, [props.courseId, props.lessonId]);

  const wmText = `${props.watermarkLabel} · ${maskIranianMobile(props.watermarkMobile)} · شناسه ${props.userId.slice(-4)}`;

  return (
    <div className="academy-player-shell">
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center text-white/70">
          در حال آماده‌سازی پخش…
        </div>
      ) : null}
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-white">
          {error}
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            className="size-full"
            controls
            playsInline
            controlsList="nodownload"
            preload="metadata"
          />
          <div
            className={`academy-watermark absolute ${positions[wmPos]}`}
            aria-hidden
          >
            {wmText}
          </div>
        </>
      )}
    </div>
  );
}
