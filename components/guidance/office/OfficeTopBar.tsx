import Link from "next/link";

export function OfficeTopBar({
  userDisplayName,
  statusLabel,
}: {
  userDisplayName: string;
  statusLabel: string;
}) {
  return (
    <header className="chamber-mast">
      <div>
        <p>دپارتمان انتخاب رشته · قلم‌چی نسیم‌شهر</p>
        <strong>{statusLabel}</strong>
      </div>
      <div className="chamber-mast__end">
        <span>{userDisplayName}</span>
        <form action="/portal/logout" method="post">
          <input type="hidden" name="next" value="/guidance" />
          <button type="submit">خروج آرام</button>
        </form>
        <Link href="/guidance">درِ دفتر</Link>
      </div>
    </header>
  );
}
