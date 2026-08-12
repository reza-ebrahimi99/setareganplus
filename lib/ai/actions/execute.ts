import type { ActionCard } from "@/types/action-card";

export type ActionRouter = {
  push: (href: string) => void;
};

export type ExecuteActionCardInput = {
  card: ActionCard;
  router: ActionRouter;
  onChat?: (prompt: string) => void;
};

export type ExecuteActionCardResult =
  | { ok: true; feedback?: "copied" }
  | { ok: false; error: string };

async function copyToClipboard(text: string): Promise<boolean> {
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through
    }
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Executes a single ActionCard. Every supported type performs a real side-effect.
 */
export async function executeActionCard(
  input: ExecuteActionCardInput,
): Promise<ExecuteActionCardResult> {
  const { card, router, onChat } = input;

  switch (card.type) {
    case "chat": {
      const prompt = card.prompt?.trim();
      if (!prompt) return { ok: false, error: "PROMPT_REQUIRED" };
      if (!onChat) return { ok: false, error: "CHAT_HANDLER_MISSING" };
      onChat(prompt);
      return { ok: true };
    }
    case "navigate":
    case "open-form": {
      if (!card.href.startsWith("/")) {
        return { ok: false, error: "INVALID_HREF" };
      }
      router.push(card.href);
      return { ok: true };
    }
    case "call": {
      if (!card.href.startsWith("tel:")) {
        return { ok: false, error: "INVALID_TEL" };
      }
      window.location.assign(card.href);
      return { ok: true };
    }
    case "external": {
      if (
        !card.href.startsWith("http://") &&
        !card.href.startsWith("https://")
      ) {
        return { ok: false, error: "INVALID_EXTERNAL" };
      }
      window.open(card.href, "_blank", "noopener,noreferrer");
      return { ok: true };
    }
    case "copy": {
      const text = (card.copyText ?? card.href.replace(/^tel:/, "")).trim();
      if (!text) return { ok: false, error: "COPY_EMPTY" };
      const ok = await copyToClipboard(text);
      if (!ok) return { ok: false, error: "COPY_FAILED" };
      return { ok: true, feedback: "copied" };
    }
    default:
      return { ok: false, error: "UNSUPPORTED" };
  }
}
