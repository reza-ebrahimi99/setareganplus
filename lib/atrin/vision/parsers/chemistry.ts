/**
 * Chemistry parser — formula normalization helpers; no reaction solver.
 */

import type {
  ChemistryParseNode,
  ChemistryParseResult,
} from "@/lib/atrin/vision/types";

const SUBSCRIPTS: Record<string, string> = {
  "₀": "0",
  "₁": "1",
  "₂": "2",
  "₃": "3",
  "₄": "4",
  "₅": "5",
  "₆": "6",
  "₇": "7",
  "₈": "8",
  "₉": "9",
};

/** Normalize common unicode chemistry notation to ASCII formulas. */
export function normalizeChemicalFormula(raw: string): string {
  return raw.replace(/[₀-₉]/g, (ch) => SUBSCRIPTS[ch] ?? ch).replace(/\s+/g, "");
}

const HINTS: Array<{ kind: ChemistryParseNode["kind"]; re: RegExp }> = [
  { kind: "reaction", re: /→|⟶|واکنش|reaction|balances?/i },
  { kind: "acid", re: /اسید|HCl|H2SO4|acid/i },
  { kind: "base", re: /باز|NaOH|base/i },
  { kind: "organic", re: /آلی|CH4|C2H5|organic/i },
  { kind: "periodic", re: /جدول\s*تناوبی|periodic/i },
  { kind: "mole", re: /مول|mole|mol\b/i },
  { kind: "oxidation", re: /اکسایش|oxidation/i },
  { kind: "reduction", re: /احیا|reduction/i },
  { kind: "formula", re: /H2O|CO2|NaCl|[A-Z][a-z]?\d+/ },
];

export function parseChemistryStructures(text: string): ChemistryParseResult {
  const nodes: ChemistryParseNode[] = [];
  for (const hint of HINTS) {
    if (hint.re.test(text)) {
      nodes.push({
        kind: hint.kind,
        raw: text.slice(0, 120),
        normalizedFormula:
          hint.kind === "formula" ? normalizeChemicalFormula(text) : undefined,
      });
    }
  }
  return {
    ok: true,
    nodes: nodes.length
      ? nodes
      : [{ kind: "unknown", raw: text.slice(0, 120) }],
  };
}

export type ChemistryParserAdapter = {
  readonly id: string;
  parse(text: string): ChemistryParseResult;
  normalizeFormula(raw: string): string;
};

export const CHEMISTRY_PARSER_ADAPTERS: ChemistryParserAdapter[] = [
  {
    id: "heuristic-v1",
    parse: parseChemistryStructures,
    normalizeFormula: normalizeChemicalFormula,
  },
];
