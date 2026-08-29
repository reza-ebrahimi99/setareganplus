/**
 * Physics parser — domain / units / constants recognition; no numeric solve.
 */

import type {
  PhysicsParseNode,
  PhysicsParseResult,
} from "@/lib/atrin/vision/types";

const HINTS: Array<{ kind: PhysicsParseNode["kind"]; re: RegExp }> = [
  { kind: "motion", re: /حرکت|سرعت|شتاب|motion|velocity|acceleration/i },
  { kind: "energy", re: /انرژی|ژول|joule|kinetic|potential/i },
  { kind: "force", re: /نیرو|نیوتن|force|newton/i },
  { kind: "pressure", re: /فشار|پاسکال|pressure|pascal/i },
  { kind: "electricity", re: /الکتریسیته|ولتاژ|آمپر|ohm|volt|ampere/i },
  { kind: "magnetism", re: /مغناطیس|میدان\s*مغناطیسی|magnet/i },
  { kind: "heat", re: /گرما|دما|کلوین|heat|temperature|kelvin/i },
  { kind: "optics", re: /نور|عدسی|آینه|optics|lens|mirror/i },
  { kind: "modern", re: /نسبیت|کوانتوم|modern\s*physics|quantum/i },
  { kind: "unit", re: /\b(m\/s|N|J|W|V|A|Pa|kg)\b|واحد/ },
  { kind: "constant", re: /ثابت|g\s*=\s*9\.8|c\s*=|constant/i },
];

export function parsePhysicsStructures(text: string): PhysicsParseResult {
  const nodes: PhysicsParseNode[] = [];
  for (const hint of HINTS) {
    if (hint.re.test(text)) {
      const node: PhysicsParseNode = {
        kind: hint.kind,
        raw: text.slice(0, 120),
      };
      if (hint.kind === "unit") node.unitHint = "detected";
      if (hint.kind === "constant") node.constantHint = "detected";
      nodes.push(node);
    }
  }
  return {
    ok: true,
    nodes: nodes.length
      ? nodes
      : [{ kind: "unknown", raw: text.slice(0, 120) }],
  };
}

export type PhysicsParserAdapter = {
  readonly id: string;
  parse(text: string): PhysicsParseResult;
};

export const PHYSICS_PARSER_ADAPTERS: PhysicsParserAdapter[] = [
  { id: "heuristic-v1", parse: parsePhysicsStructures },
];
