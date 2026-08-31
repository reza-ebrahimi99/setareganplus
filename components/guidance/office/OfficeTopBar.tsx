import Link from "next/link";

export function OfficeTopBar({
  userDisplayName,
  statusLabel,
}: {
  userDisplayName: string;
  statusLabel: string;
}) {
  return (
    <header className="chamber-colophon">
      <div>
        <p>دفتر انتخاب رشته · مهندس رضا ابراهیمی</p>
        <strong>{statusLabel}</strong>
      </div>
      <div className="chamber-colophon__end">
        <span>{userDisplayName}</span>
        <form action="/portal/logout" method="post">
          <input type="hidden" name="next" value="/guidance" />
          <button type="submit">خروج</button>
        </form>
        <Link href="/guidance">درِ دفتر</Link>
      </div>
    </header>
  );
}
