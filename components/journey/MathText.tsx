"use client";
import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

function render(src: string) {
  return src
    .split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+\$)/g)
    .map((part) => {
      if (part.startsWith("$$") && part.endsWith("$$")) return katex.renderToString(part.slice(2, -2), { throwOnError: false, displayMode: true });
      if (part.startsWith("$") && part.endsWith("$")) return katex.renderToString(part.slice(1, -1), { throwOnError: false });
      return part.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br/>");
    })
    .join("");
}

export function MathText({ text, className }: { text: string; className?: string }) {
  const html = useMemo(() => render(text), [text]);
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
