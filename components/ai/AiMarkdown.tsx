"use client";

import type { ReactNode } from "react";
import { toPersianDigits } from "@/lib/persian";

type AiMarkdownProps = {
  content: string;
};

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(
        <span key={`${keyPrefix}-t-${i++}`}>
          {toPersianDigits(text.slice(lastIndex, match.index))}
        </span>,
      );
    }

    const token = match[0];
    if (token.startsWith("**")) {
      nodes.push(
        <strong key={`${keyPrefix}-b-${i++}`} className="font-semibold text-primary">
          {toPersianDigits(token.slice(2, -2))}
        </strong>,
      );
    } else if (token.startsWith("`")) {
      nodes.push(
        <code
          key={`${keyPrefix}-c-${i++}`}
          className="rounded bg-background px-1.5 py-0.5 text-[0.8em] text-primary"
        >
          {toPersianDigits(token.slice(1, -1))}
        </code>,
      );
    } else {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        nodes.push(
          <a
            key={`${keyPrefix}-a-${i++}`}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-secondary underline-offset-2 hover:underline"
          >
            {toPersianDigits(linkMatch[1])}
          </a>,
        );
      }
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(
      <span key={`${keyPrefix}-t-${i++}`}>
        {toPersianDigits(text.slice(lastIndex))}
      </span>,
    );
  }

  return nodes;
}

/**
 * Lightweight markdown renderer (no extra packages).
 * Supports paragraphs, lists, bold, inline code, and links.
 */
export function AiMarkdown({ content }: AiMarkdownProps) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];
  let blockIndex = 0;

  const flushList = () => {
    if (listItems.length === 0) return;
    blocks.push(
      <ul
        key={`list-${blockIndex++}`}
        className="my-2 list-disc space-y-1 ps-5 text-sm leading-7"
      >
        {listItems.map((item, index) => (
          <li key={index}>{renderInline(item, `li-${blockIndex}-${index}`)}</li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      continue;
    }

    if (/^[-*•]\s+/.test(trimmed)) {
      listItems.push(trimmed.replace(/^[-*•]\s+/, ""));
      continue;
    }

    flushList();
    blocks.push(
      <p key={`p-${blockIndex++}`} className="text-sm leading-7">
        {renderInline(trimmed, `p-${blockIndex}`)}
      </p>,
    );
  }

  flushList();

  return <div className="space-y-1">{blocks}</div>;
}
