"use client";

type AiErrorProps = {
  message: string;
  onRetry: () => void;
  disabled?: boolean;
};

export function AiError({ message, onRetry, disabled }: AiErrorProps) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm leading-7 text-primary"
    >
      <p>{message}</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={disabled}
        className="mt-3 inline-flex min-h-9 items-center justify-center rounded-xl border border-border bg-white px-3 text-xs font-medium text-primary transition-colors hover:border-secondary/40 disabled:cursor-not-allowed disabled:opacity-60"
      >
        تلاش مجدد
      </button>
    </div>
  );
}
