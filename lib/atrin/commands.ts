import { ATRIN_COMMANDS } from "@/content/atrin-os";

export function resolveAtrinCommand(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) return null;
  const token = trimmed.split(/\s+/)[0]?.toLowerCase() ?? "";
  const match = ATRIN_COMMANDS.find((item) => item.command === token);
  if (!match) return null;
  const rest = trimmed.slice(token.length).trim();
  return rest ? `${match.prompt} — ${rest}` : match.prompt;
}

export function filterAtrinCommands(query: string) {
  const q = query.trim().toLowerCase();
  if (!q.startsWith("/")) return [];
  return ATRIN_COMMANDS.filter(
    (item) =>
      item.command.includes(q) ||
      item.label.includes(q.replace("/", "")) ||
      q === "/",
  );
}
