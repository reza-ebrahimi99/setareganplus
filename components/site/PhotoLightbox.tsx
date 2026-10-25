"use client";
/* eslint-disable @next/next/no-img-element */
import { useRef } from "react";

/**
 * Click-to-enlarge photo. Only opens when the visitor clicks (never on its own).
 * Without JS the link simply opens the full-size image.
 */
export function PhotoLightbox({ full, alt, children, label }: { full: string; alt: string; children: React.ReactNode; label: string }) {
  const dlg = useRef<HTMLDialogElement>(null);
  return (
    <>
      <a
        href={full}
        aria-label={label}
        onClick={(e) => {
          if (!dlg.current?.showModal) return;
          e.preventDefault();
          dlg.current.showModal();
        }}
        className="group relative block cursor-zoom-in"
      >
        {children}
        <span className="pointer-events-none absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-navy/75 px-3 py-1.5 text-xs font-bold text-white backdrop-blur transition group-hover:bg-navy">
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2M11 8.5v5M8.5 11h5" strokeLinecap="round" /></svg>
          مشاهدهٔ بزرگ‌تر
        </span>
      </a>
      <dialog
        ref={dlg}
        aria-label={alt}
        onClick={(e) => { if (e.target === e.currentTarget) dlg.current?.close(); }}
        className="m-auto max-h-[94vh] max-w-[96vw] overflow-visible bg-transparent p-0 backdrop:bg-navy/85 backdrop:backdrop-blur-sm"
      >
        <img src={full} alt={alt} className="max-h-[88vh] w-auto max-w-[96vw] rounded-2xl border-4 border-gold object-contain shadow-2xl" />
        <button
          type="button"
          onClick={() => dlg.current?.close()}
          className="absolute -top-4 -left-4 grid size-10 place-items-center rounded-full bg-gold text-navy shadow-lg"
          aria-label="بستن"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>
        </button>
      </dialog>
    </>
  );
}
