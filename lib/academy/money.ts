export { formatTomanFromRials } from "@/lib/counselor-os/labels";

export function maskIranianMobile(mobile: string | null | undefined): string {
  const m = (mobile ?? "").replace(/\D/g, "");
  if (m.length < 10) return "—";
  const normalized = m.startsWith("98") ? `0${m.slice(2)}` : m;
  if (normalized.length !== 11) return "—";
  return `${normalized.slice(0, 4)}***${normalized.slice(-4)}`;
}
