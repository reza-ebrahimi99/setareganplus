"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { playerSrc } from "@/lib/classes/catalog";
import { markSeenAction } from "@/app/(site)/classes/actions";

export function Player({ lessonId, hash, title, completed, poster }: { lessonId: string; hash: string; title: string; completed: boolean; poster?: string | null }) {
  const box = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [done, setDone] = useState(completed);
  const [note, setNote] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!playing) return;
    let acc = 0;
    let last = Date.now();
    const tick = window.setInterval(() => {
      const now = Date.now();
      const dt = (now - last) / 1000;
      last = now;
      const rect = box.current?.getBoundingClientRect();
      const inView = !!rect && rect.bottom > 80 && rect.top < window.innerHeight - 40;
      const active = document.visibilityState === "visible" && document.hasFocus() && inView;
      if (!active) return;
      acc += dt;
      if (acc < 15) return;
      const delta = Math.round(acc);
      acc = 0;
      void fetch("/api/classes/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, delta }),
      }).then((r) => r.json()).then((j: { completed?: boolean }) => {
        if (j.completed) setDone(true);
      }).catch(() => undefined);
    }, 1000);
    return () => window.clearInterval(tick);
  }, [playing, lessonId]);

  return (
    <div ref={box} className="cl-card overflow-hidden">
      <div className="relative aspect-video bg-[#07101f]">
        {playing ? (
          <iframe
            src={playerSrc(hash)}
            title={title}
            className="absolute inset-0 size-full"
            allow="autoplay; fullscreen; encrypted-media"
            allowFullScreen
            referrerPolicy="no-referrer"
          />
        ) : (
          <button type="button" className="absolute inset-0" onClick={() => setPlaying(true)} aria-label={`پخش ${title}`}>
            <img src={poster || `/classes/cover/${hash}`} alt="" className="size-full object-cover" />
            <span className="absolute inset-0 bg-gradient-to-t from-[#07101f]/80 to-transparent" />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex size-16 items-center justify-center rounded-full bg-[#f4b21b] text-[#0a1a3f] shadow-2xl transition-transform hover:scale-105">
                <svg viewBox="0 0 24 24" className="mr-[-2px] size-7" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5-11-6.5Z" /></svg>
              </span>
            </span>
            <span className="cl-display absolute right-4 bottom-4 left-4 text-right text-lg text-white">{title}</span>
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-sm font-bold">{done ? "این جلسه را دیدی" : "پیشرفت تماشا همین‌جا ذخیره می‌شود"}</p>
        <form action={async () => {
          const res = await markSeenAction(lessonId);
          if (res.ok) {
            setDone(true);
            setNote(res.certificate ? "دوره تمام شد. گواهی‌ات آماده است." : "ثبت شد.");
            router.refresh();
          } else setNote(res.error);
        }}>
          <button className="btn-gold px-4 py-2 text-sm" type="submit">{done ? "دیدم ✓" : "دیدم"}</button>
        </form>
      </div>
      {note && <p className="px-4 pb-4 text-sm font-semibold text-emerald-700">{note}</p>}
    </div>
  );
}
