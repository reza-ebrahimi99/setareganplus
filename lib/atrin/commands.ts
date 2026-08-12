import { ATRIN_COMMANDS } from "@/content/atrin-os";

const EXTRA = [
  { command: "/tuition", prompt: "شهریه" },
  { command: "/math", prompt: "یک سوال ریاضی دارم" },
  { command: "/science", prompt: "یک سوال علوم دارم" },
  { command: "/english", prompt: "یک سوال انگلیسی دارم" },
  { command: "/classes", prompt: "کلاس‌ها" },
  { command: "/advisor", prompt: "مشاوره تحصیلی می‌خواهم" },
] as const;

const ALL = [
  ...ATRIN_COMMANDS.map((item) => ({
    command: item.command,
    prompt: item.prompt,
    label: item.label,
  })),
  ...EXTRA.map((item) => ({
    command: item.command,
    prompt: item.prompt,
    label: item.command,
  })),
];

export function resolveAtrinCommand(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) return null;
  const token = trimmed.split(/\s+/)[0]?.toLowerCase() ?? "";
  const match = ALL.find((item) => item.command === token);
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
