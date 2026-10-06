"use client";

import { useState } from "react";

export function CopyShareButtons(props: { url: string; text?: string }) {
  const [copied, setCopied] = useState(false);
  const message = props.text ? `${props.text}\n${props.url}` : props.url;

  async function copy() {
    await navigator.clipboard.writeText(props.url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="challenge-share-actions">
      <button type="button" onClick={copy} className="challenge-button challenge-button-secondary">
        {copied ? "کپی شد ✓" : "کپی لینک"}
      </button>
      <a
        className="challenge-button challenge-button-whatsapp"
        href={`https://wa.me/?text=${encodeURIComponent(message)}`}
        target="_blank"
        rel="noreferrer"
      >
        اشتراک در واتساپ
      </a>
    </div>
  );
}

