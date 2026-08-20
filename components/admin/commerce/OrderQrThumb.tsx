import { commerceOrderQrImagePath, commerceOrderQrPath } from "@/lib/commerce/orders/qr";

export function OrderQrThumb({
  token,
  size = 64,
  label = "QR",
}: {
  token: string;
  size?: number;
  label?: string;
}) {
  if (!token) return null;
  return (
    <a
      href={commerceOrderQrPath(token)}
      onClick={(event) => event.stopPropagation()}
      className="inline-flex flex-col items-center gap-1 rounded-xl border border-border bg-white p-1.5 hover:border-primary/40"
      title="باز کردن صفحه دریافت"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${commerceOrderQrImagePath(token)}?preview=1`}
        alt={label}
        width={size}
        height={size}
        className="rounded-md"
      />
      <span className="text-[10px] text-muted">اسکن / دریافت</span>
    </a>
  );
}
