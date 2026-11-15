"use client";
import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

function escapePlain(part: string) {
  return part.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br/>");
}

function isolate(latex: string, display: boolean) {
  const html = katex.renderToString(latex, { throwOnError: false, displayMode: display });
  const style = display
    ? "unicode-bidi:isolate;direction:ltr;display:block"
    : "unicode-bidi:isolate;direction:ltr;display:inline-block";
  return `<span dir="ltr" style="${style}">${html}</span>`;
}

function render(src: string) {
  return src
    .split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+\$)/g)
    .map((part) => {
      if (part.startsWith("$$") && part.endsWith("$$")) return isolate(part.slice(2, -2), true);
      if (part.startsWith("$") && part.endsWith("$")) return isolate(part.slice(1, -1), false);
      return escapePlain(part);
    })
    .join("");
}

export function MathText({ text, className }: { text: string; className?: string }) {
  const html = useMemo(() => render(text), [text]);
  return <span className={className} dir="rtl" dangerouslySetInnerHTML={{ __html: html }} />;
}
