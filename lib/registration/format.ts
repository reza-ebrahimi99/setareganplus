import { toPersianDigits } from "@/lib/persian";

/** Display helper — DB stores Rials; public UI shows Tomans. */
export function formatTomansFromRials(amountRials: number): string {
  const tomans = Math.round(amountRials / 10);
  const formatted = new Intl.NumberFormat("fa-IR").format(tomans);
  return `${toPersianDigits(formatted)} تومان`;
}

export function formatRials(amount: number): string {
  const formatted = new Intl.NumberFormat("fa-IR").format(amount);
  return `${toPersianDigits(formatted)} ریال`;
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
