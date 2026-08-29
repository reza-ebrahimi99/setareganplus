"use client";

type AiTypingProps = {
  label?: string;
};

export function AiTyping({ label = "در حال نوشتن پاسخ…" }: AiTypingProps) {
  return (
    <div
      className="inline-flex items-center gap-2 rounded-2xl rounded-ss-md border border-border bg-white px-3 py-2 text-xs text-muted shadow-sm"
      role="status"
      aria-live="polite"
    >
      <span className="flex items-center gap-1" aria-hidden="true">
        <span className="ai-typing-dot size-1.5 rounded-full bg-secondary" />
        <span className="ai-typing-dot size-1.5 rounded-full bg-secondary [animation-delay:120ms]" />
        <span className="ai-typing-dot size-1.5 rounded-full bg-secondary [animation-delay:240ms]" />
      </span>
      <span>{label}</span>
    </div>
  );
}
