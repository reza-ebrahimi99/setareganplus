import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Tiny, safe markdown subset → React elements (never dangerouslySetInnerHTML).
 *   ## heading / ### subheading, - or * bullet, 1. numbered, > quote,
 *   **bold**, [text](https://… or /path), blank line = new paragraph.
 * Anything else is plain text, so raw HTML is shown as text and cannot run.
 */
const SAFE_URL = /^(https?:\/\/|\/(?!\/)|tel:|mailto:)/i;

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0, m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(<strong key={`${key}b${i++}`}>{m[1]}</strong>);
    else if (SAFE_URL.test(m[3])) {
      const href = m[3];
      out.push(href.startsWith("/")
        ? <Link key={`${key}l${i++}`} href={href}>{m[2]}</Link>
        : <a key={`${key}l${i++}`} href={href} rel="noopener nofollow" target="_blank">{m[2]}</a>);
    } else out.push(m[2]);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

type Kind = "h2" | "h3" | "ul" | "ol" | "q" | "p";
const kindOf = (l: string): Kind =>
  /^###\s/.test(l) ? "h3" : /^##?\s/.test(l) ? "h2" : /^\s*[-*•]\s+/.test(l) ? "ul" : /^\s*[\d۰-۹]+[.)]\s+/.test(l) ? "ol" : /^>\s?/.test(l) ? "q" : "p";
const strip: Record<Kind, RegExp> = { h2: /^##?\s+/, h3: /^###\s+/, ul: /^\s*[-*•]\s+/, ol: /^\s*[\d۰-۹]+[.)]\s+/, q: /^>\s?/, p: /^/ };

/** Line based: headings stand alone; consecutive list / quote / text lines group together. */
export function Markdown({ text, className }: { text: string; className?: string }) {
  const groups: { kind: Kind; lines: string[] }[] = [];
  let cur: { kind: Kind; lines: string[] } | null = null;
  for (const raw of text.replace(/\r\n?/g, "\n").split("\n")) {
    const l = raw.trimEnd();
    if (!l.trim()) { cur = null; continue; }
    const kind = kindOf(l);
    const body = l.replace(strip[kind], "").trim();
    if (kind === "h2" || kind === "h3") { groups.push({ kind, lines: [body] }); cur = null; continue; }
    if (cur && cur.kind === kind) cur.lines.push(body);
    else { cur = { kind, lines: [body] }; groups.push(cur); }
  }
  const out = groups.map((g, gi) => {
    const k = `k${gi}`;
    switch (g.kind) {
      case "h2": return <h2 key={k}>{inline(g.lines[0], k)}</h2>;
      case "h3": return <h3 key={k}>{inline(g.lines[0], k)}</h3>;
      case "ul": return <ul key={k}>{g.lines.map((l, i) => <li key={i}>{inline(l, `${k}${i}`)}</li>)}</ul>;
      case "ol": return <ol key={k}>{g.lines.map((l, i) => <li key={i}>{inline(l, `${k}${i}`)}</li>)}</ol>;
      case "q": return <blockquote key={k}>{inline(g.lines.join(" "), k)}</blockquote>;
      default: return <p key={k}>{g.lines.flatMap((l, i) => (i ? [<br key={`br${i}`} />, ...inline(l, `${k}${i}`)] : inline(l, `${k}${i}`)))}</p>;
    }
  });
  return <div className={className}>{out}</div>;
}

/** Plain text (for meta description / JSON-LD). */
export function mdToText(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/^\s*(#{1,3}|[-*•>]|[\d۰-۹]+[.)])\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}
