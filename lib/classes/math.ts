import katex from "katex";

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}

/** Escape text, then render $inline$ and $$display$$ with KaTeX. Raw HTML from staff or students is never kept. */
export function renderMath(src: string) {
  const parts = src.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g);
  return parts
    .map((p) => {
      if (p.startsWith("$$") && p.endsWith("$$") && p.length > 4) {
        return katex.renderToString(p.slice(2, -2), { displayMode: true, throwOnError: false, trust: false });
      }
      if (p.startsWith("$") && p.endsWith("$") && p.length > 2) {
        return katex.renderToString(p.slice(1, -1), { displayMode: false, throwOnError: false, trust: false });
      }
      return esc(p).replace(/\n/g, "<br>");
    })
    .join("");
}
