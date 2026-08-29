"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  name?: string;
  disabled?: boolean;
};

export function PickupSignaturePad({ name = "pickupSignaturePng", disabled = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [dataUrl, setDataUrl] = useState("");

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = canvas.offsetWidth || 320;
    const height = 140;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    setDataUrl("");
  }, []);

  useEffect(() => {
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [resize]);

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    drawing.current = true;
    const { x, y } = point(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || disabled) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = point(event);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDataUrl(canvas.toDataURL("image/png"));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted">امضای دانش‌آموز (اختیاری)</p>
        <button
          type="button"
          onClick={resize}
          disabled={disabled}
          className="text-xs text-primary"
        >
          پاک کردن
        </button>
      </div>
      <canvas
        ref={canvasRef}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        className="h-[140px] w-full touch-none rounded-2xl border border-dashed border-border bg-white"
        style={{ touchAction: "none" }}
      />
      <input type="hidden" name={name} value={dataUrl} />
    </div>
  );
}
