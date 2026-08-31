import Link from "next/link";
import { PortalIcon } from "@/components/portal/icons";

export function OfficeTopBar({
  userDisplayName,
  statusLabel,
}: {
  userDisplayName: string;
  statusLabel: string;
}) {
  return (
    <header className="atelier-top">
      <div>
        <p className="atelier-top__eyebrow">دپارتمان انتخاب رشته · قلم‌چی نسیم‌شهر</p>
        <p className="atelier-top__status">{statusLabel}</p>
      </div>
      <div className="atelier-top__end">
        <span className="atelier-top__user">
          <PortalIcon name="user" className="size-4" />
          {userDisplayName}
        </span>
        <form action="/portal/logout" method="post">
          <input type="hidden" name="next" value="/guidance" />
          <button type="submit" className="atelier-top__exit">
            <PortalIcon name="logout" className="size-4" />
            خروج آرام
          </button>
        </form>
        <Link href="/guidance" className="atelier-top__exit">
          درِ دفتر
        </Link>
      </div>
    </header>
  );
}
