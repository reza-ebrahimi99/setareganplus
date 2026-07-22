import { toPersianDigits } from "@/lib/persian";

export function formatRials(amount: number): string {
  const formatted = new Intl.NumberFormat("fa-IR").format(amount);
  return `${formatted} ریال`;
}

export function formatRegistrationDate(date: Date): string {
  return toPersianDigits(
    new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date),
  );
}
