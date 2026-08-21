import { CommerceQrImg } from "@/components/commerce/CommerceQrImg";
import { commerceOrderQrImagePath, commerceOrderQrPath } from "@/lib/commerce/orders/qr";

export function OrderQrThumb({
  token,
  size = 96,
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
      <CommerceQrImg
        src={`${commerceOrderQrImagePath(token)}?preview=1`}
        alt={label}
        size={size}
      />
      <span className="text-[10px] text-muted">اسکن / دریافت</span>
    </a>
  );
}
