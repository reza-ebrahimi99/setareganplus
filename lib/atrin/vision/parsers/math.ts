/**
 * Math structure parser — interfaces only; no solving.
 */

import type { MathParseNode, MathParseResult } from "@/lib/atrin/vision/types";

const HINTS: Array<{ kind: MathParseNode["kind"]; re: RegExp }> = [
  { kind: "fraction", re: /\d+\s*\/\s*\d+|کسر|fraction/i },
  { kind: "root", re: /√|رادیکال|sqrt|root/i },
  { kind: "matrix", re: /ماتریس|matrix|\[\[/i },
  { kind: "limit", re: /حد|lim\s*[:\(]|limit/i },
  { kind: "derivative", re: /مشتق|d\/dx|derivative/i },
  { kind: "integral", re: /∫|انتگرال|integral/i },
  { kind: "trigonometry", re: /sin|cos|tan|مثلثاتی/i },
  { kind: "probability", re: /احتمال|P\(|probability/i },
  { kind: "statistics", re: /میانگین|واریانس|statistics|mean/i },
  { kind: "geometry", re: /مثلث|زاویه|مساحت|geometry/i },
  { kind: "function", re: /f\s*\(|تابع|function/i },
];

/**
 * Lightweight recognition of math *kinds* from text.
 * Full AST parsing / solving is intentionally not implemented.
 */
export function parseMathStructures(text: string): MathParseResult {
  const nodes: MathParseNode[] = [];
  for (const hint of HINTS) {
    if (hint.re.test(text)) {
      nodes.push({ kind: hint.kind, raw: text.slice(0, 120) });
    }
  }
  return {
    ok: true,
    nodes: nodes.length ? nodes : [{ kind: "unknown", raw: text.slice(0, 120) }],
  };
}

export type MathParserAdapter = {
  readonly id: string;
  parse(text: string): MathParseResult;
};

export const MATH_PARSER_ADAPTERS: MathParserAdapter[] = [
  { id: "heuristic-v1", parse: parseMathStructures },
];
