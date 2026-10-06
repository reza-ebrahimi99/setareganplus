import { Fragment, createElement, type ReactNode } from "react";

type ParseResult = {
  nodes: ReactNode[];
  index: number;
};

const COMMAND_SYMBOLS: Record<string, string> = {
  cdot: "·",
  div: "÷",
  ge: "≥",
  geq: "≥",
  le: "≤",
  leq: "≤",
  neq: "≠",
  pi: "π",
  pm: "±",
  times: "×",
};

function mathToken(character: string, key: string): ReactNode {
  if (/^[0-9۰-۹]$/.test(character)) {
    return createElement("mn", { key }, character);
  }
  if (/^[A-Za-zآ-ی]$/.test(character)) {
    return createElement("mi", { key }, character);
  }
  if (/^\s$/.test(character)) {
    return createElement("mspace", { key, width: "0.3em" });
  }
  return createElement("mo", { key }, character);
}

function parseArgument(input: string, start: number, keyPrefix: string): ParseResult {
  if (input[start] === "{") {
    return parseMath(input, start + 1, "}", keyPrefix);
  }
  if (start >= input.length) return { nodes: [], index: start };
  return {
    nodes: [mathToken(input[start]!, `${keyPrefix}-single`)],
    index: start + 1,
  };
}

function parseOptionalRoot(
  input: string,
  start: number,
  keyPrefix: string,
): ParseResult | null {
  if (input[start] !== "[") return null;
  return parseMath(input, start + 1, "]", keyPrefix);
}

function parseMath(
  input: string,
  start = 0,
  terminator?: string,
  keyPrefix = "math",
): ParseResult {
  const nodes: ReactNode[] = [];
  let index = start;
  while (index < input.length) {
    const character = input[index]!;
    if (terminator && character === terminator) {
      return { nodes, index: index + 1 };
    }

    if (character === "{") {
      const group = parseMath(input, index + 1, "}", `${keyPrefix}-${index}`);
      nodes.push(
        createElement("mrow", { key: `${keyPrefix}-group-${index}` }, group.nodes),
      );
      index = group.index;
      continue;
    }

    if (character === "\\") {
      const commandMatch = /^\\([A-Za-z]+)/.exec(input.slice(index));
      if (!commandMatch) {
        nodes.push(mathToken(character, `${keyPrefix}-${index}`));
        index += 1;
        continue;
      }
      const command = commandMatch[1]!;
      index += commandMatch[0].length;
      if (command === "left" || command === "right") continue;
      if (command === "frac") {
        const numerator = parseArgument(
          input,
          index,
          `${keyPrefix}-num-${index}`,
        );
        const denominator = parseArgument(
          input,
          numerator.index,
          `${keyPrefix}-den-${numerator.index}`,
        );
        nodes.push(
          createElement(
            "mfrac",
            { key: `${keyPrefix}-frac-${index}` },
            createElement("mrow", null, numerator.nodes),
            createElement("mrow", null, denominator.nodes),
          ),
        );
        index = denominator.index;
        continue;
      }
      if (command === "sqrt") {
        const optionalRoot = parseOptionalRoot(
          input,
          index,
          `${keyPrefix}-root-index-${index}`,
        );
        if (optionalRoot) index = optionalRoot.index;
        const radicand = parseArgument(
          input,
          index,
          `${keyPrefix}-radicand-${index}`,
        );
        nodes.push(
          optionalRoot
            ? createElement(
                "mroot",
                { key: `${keyPrefix}-root-${index}` },
                createElement("mrow", null, radicand.nodes),
                createElement("mrow", null, optionalRoot.nodes),
              )
            : createElement(
                "msqrt",
                { key: `${keyPrefix}-sqrt-${index}` },
                createElement("mrow", null, radicand.nodes),
              ),
        );
        index = radicand.index;
        continue;
      }
      if (command === "text") {
        const text = parseArgument(input, index, `${keyPrefix}-text-${index}`);
        nodes.push(
          createElement("mtext", { key: `${keyPrefix}-text-${index}` }, text.nodes),
        );
        index = text.index;
        continue;
      }
      const symbol = COMMAND_SYMBOLS[command];
      nodes.push(
        createElement(
          symbol ? "mo" : "mtext",
          { key: `${keyPrefix}-command-${index}` },
          symbol ?? command,
        ),
      );
      continue;
    }

    if ((character === "^" || character === "_") && nodes.length > 0) {
      const base = nodes.pop()!;
      const argument = parseArgument(
        input,
        index + 1,
        `${keyPrefix}-script-${index}`,
      );
      nodes.push(
        createElement(
          character === "^" ? "msup" : "msub",
          { key: `${keyPrefix}-scripted-${index}` },
          createElement("mrow", null, base),
          createElement("mrow", null, argument.nodes),
        ),
      );
      index = argument.index;
      continue;
    }

    nodes.push(mathToken(character, `${keyPrefix}-${index}`));
    index += 1;
  }
  return { nodes, index };
}

function Formula({ value }: { value: string }) {
  const parsed = parseMath(value.trim());
  return createElement(
    "math",
    {
      dir: "ltr",
      "aria-label": value,
      style: {
        display: "inline-block",
        direction: "ltr",
        fontSize: "1.14em",
        lineHeight: 1.5,
        unicodeBidi: "isolate",
      },
    },
    createElement("mrow", null, parsed.nodes),
  );
}

function looksLikeFormula(value: string): boolean {
  return (
    /\\(?:frac|sqrt|times|cdot|pm|div|le|ge|neq|pi)\b/.test(value) ||
    /[A-Za-z0-9۰-۹]\s*[\^_]/.test(value)
  );
}

export function MathText({ text }: { text: string }) {
  if (!text.includes("$") && looksLikeFormula(text)) {
    return <Formula value={text} />;
  }

  const parts = text.split(/(\$[^$]+\$)/g).filter(Boolean);
  return (
    <span dir="auto">
      {parts.map((part, index) =>
        part.startsWith("$") && part.endsWith("$") ? (
          <Formula key={index} value={part.slice(1, -1)} />
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </span>
  );
}
