"use client";

/**
 * Lightweight self-contained confetti burst (no external dependency).
 * Mounts a fixed canvas, runs a short physics burst, then unmounts itself.
 */

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  spin: number;
  color: string;
  shape: "rect" | "circle";
};

const COLORS = [
  "#5b3df5", // purple (brand)
  "#ffb800", // gold (brand)
  "#00d4ff",
  "#00c896",
  "#ff6b81",
  "#ffffff",
];

export function GuidanceStepConfetti({
  active,
  onDone,
}: {
  active: boolean;
  onDone?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    const count = 140;
    const particles: Particle[] = Array.from({ length: count }, () => {
      const originX = width / 2 + (Math.random() - 0.5) * width * 0.5;
      const angle = Math.random() * Math.PI - Math.PI / 2 - Math.PI / 4;
      const speed = 6 + Math.random() * 9;
      return {
        x: originX,
        y: height * 0.32 + Math.random() * 30,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4,
        size: 5 + Math.random() * 6,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.3,
        color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
        shape: Math.random() > 0.5 ? "rect" : "circle",
      };
    });

    let frame = 0;
    const maxFrames = 130;
    let rafId = 0;

    function tick() {
      frame += 1;
      ctx!.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.vy += 0.28;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.spin;
        const alpha = frame > maxFrames - 30 ? Math.max(0, (maxFrames - frame) / 30) : 1;
        ctx!.save();
        ctx!.globalAlpha = alpha;
        ctx!.translate(p.x, p.y);
        ctx!.rotate(p.rotation);
        ctx!.fillStyle = p.color;
        if (p.shape === "rect") {
          ctx!.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
        } else {
          ctx!.beginPath();
          ctx!.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx!.fill();
        }
        ctx!.restore();
      }

      if (frame < maxFrames) {
        rafId = requestAnimationFrame(tick);
      } else {
        ctx!.clearRect(0, 0, width, height);
        onDone?.();
      }
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="gpj-confetti-canvas"
    />
  );
}
