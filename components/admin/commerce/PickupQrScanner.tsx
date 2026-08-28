"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { parseCommerceOrderQrInput } from "@/lib/commerce/orders/qr";

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
};

type DetectorCtor = new (opts: { formats: string[] }) => BarcodeDetectorLike;

function readDetector(): DetectorCtor | null {
  if (typeof window === "undefined") return null;
  const ctor = (window as Window & { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
  if (!ctor || !navigator.mediaDevices?.getUserMedia) return null;
  return ctor;
}

type Props = {
  autoStart?: boolean;
  onToken: (token: string) => void;
};

export function PickupQrScanner({ autoStart = false, onToken }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [open, setOpen] = useState(autoStart);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  useEffect(() => {
    if (!open) {
      stop();
      return;
    }

    const Detector = readDetector();
    if (!Detector) {
      return;
    }

    let cancelled = false;
    const detector = new Detector({ formats: ["qr_code"] });

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const tick = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const raw = codes[0]?.rawValue;
            const token = parseCommerceOrderQrInput(raw ?? "");
            if (token) {
              onToken(token);
              setOpen(false);
              return;
            }
          } catch {
            /* keep scanning */
          }
          requestAnimationFrame(() => {
            void tick();
          });
        };
        requestAnimationFrame(() => {
          void tick();
        });
      } catch {
        if (!cancelled) setError("دسترسی به دوربین ممکن نشد.");
      }
    }

    void start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [open, onToken, stop]);

  const detectorReady = readDetector() !== null;
  const cameraUnsupported = open && !detectorReady;

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen((value) => !value);
        }}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-primary px-4 text-sm font-semibold text-white sm:w-auto"
      >
        {open ? "بستن دوربین" : "اسکن QR"}
      </button>
      {open && detectorReady ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-black">
          <video ref={videoRef} className="h-56 w-full object-cover" playsInline muted autoPlay />
        </div>
      ) : null}
      {cameraUnsupported ? (
        <p className="text-sm text-danger" role="alert">
          دوربین این دستگاه برای اسکن QR پشتیبانی نمی‌شود. کد را دستی وارد کنید یا تصویر QR را بارگذاری کنید.
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <label className="block text-xs text-muted">
        بارگذاری تصویر QR
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="mt-1 block w-full text-sm"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            const Detector = readDetector();
            if (!Detector) {
              setError("اسکن تصویر روی این مرورگر پشتیبانی نمی‌شود.");
              return;
            }
            try {
              const bitmap = await createImageBitmap(file);
              const detector = new Detector({ formats: ["qr_code"] });
              const codes = await detector.detect(bitmap);
              bitmap.close();
              const token = parseCommerceOrderQrInput(codes[0]?.rawValue ?? "");
              if (token) onToken(token);
              else setError("QR معتبری در تصویر پیدا نشد.");
            } catch {
              setError("خواندن تصویر ممکن نشد.");
            }
          }}
        />
      </label>
    </div>
  );
}
