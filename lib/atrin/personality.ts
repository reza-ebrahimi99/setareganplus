import type { AtrinModeId, AtrinPersonalityState } from "@/content/atrin-os";

export function resolveAtrinPersonality(input: {
  modeId: AtrinModeId;
  isLoading?: boolean;
  hasError?: boolean;
  offline?: boolean;
  showHero?: boolean;
  celebrating?: boolean;
}): AtrinPersonalityState {
  if (input.offline) return "offline";
  if (input.hasError) return "error";
  if (input.isLoading) return "thinking";
  if (input.showHero) return "greeting";
  if (input.celebrating) return "celebrating";
  if (input.modeId === "study") return "teaching";
  if (
    input.modeId === "counselor" ||
    input.modeId === "career" ||
    input.modeId === "gifted"
  ) {
    return "counseling";
  }
  if (input.modeId === "school" || input.modeId === "qalamchi") {
    return "searching";
  }
  return "greeting";
}
