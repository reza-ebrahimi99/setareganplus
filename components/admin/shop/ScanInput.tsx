"use client";
import { useEffect, useRef, useState } from "react";

type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };

/** Text box that also accepts a USB/Bluetooth scanner (types + Enter) and, where the browser supports it, the phone camera. */
export function ScanInput({ defaultValue }: { defaultValue?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [on, setOn] = useState(false);
  const [err, setErr] = useState("");
  const [supported, setSupported] = useState(false);
  useEffect(() => setSupported(typeof window !== "undefined" && "BarcodeDetector" in window && !!navigator.mediaDevices), []);

  useEffect(() => {
    if (!on) return;
    let stream: MediaStream | null = null;
    let stop = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        const det: Detector = new (window as unknown as { BarcodeDetector: new (o: object) => Detector }).BarcodeDetector({ formats: ["qr_code"] });
        while (!stop) {
          const codes = await det.detect(video.current).catch(() => []);
          if (codes[0]?.rawValue) {
            input.current!.value = codes[0].rawValue;
            setOn(false);
            input.current!.form?.requestSubmit();
            break;
          }
          await new Promise((r) => setTimeout(r, 250));
        }
      } catch {
        setErr("دسترسی به دوربین ممکن نشد؛ کد را تایپ کنید.");
        setOn(false);
      }
    })();
    return () => {
      stop = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [on]);

  return (
    <div>
      <div className="flex gap-2">
        <input ref={input} name="q" defaultValue={defaultValue} autoFocus autoComplete="off" placeholder="کد ۶ حرفی، شماره سفارش، موبایل یا اسکن QR" className="input py-3 text-lg" dir="auto" />
        <button className="btn-gold shrink-0 px-6">جستجو</button>
      </div>
      {supported && (
        <button type="button" onClick={() => { setErr(""); setOn((v) => !v); }} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-navy">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3M7 12h10" /></svg>
          {on ? "بستن دوربین" : "اسکن با دوربین"}
        </button>
      )}
      {err && <p className="mt-2 text-sm text-gc">{err}</p>}
      {on && <video ref={video} muted playsInline className="mt-3 aspect-square w-full max-w-sm rounded-2xl bg-black object-cover" />}
    </div>
  );
}
