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
    <header className="major-office__top">
      <div className="major-office__top-copy">
        <p className="major-office__top-eyebrow">ستارگان پلاس · نظارت مهندس رضا ابراهیمی</p>
        <p className="major-office__top-status">{statusLabel}</p>
      </div>
      <div className="major-office__top-end">
        <span className="major-office__top-user">
          <PortalIcon name="user" className="size-4" />
          {userDisplayName}
        </span>
        <form action="/portal/logout" method="post">
          <button type="submit" className="major-office__top-exit">
            <PortalIcon name="logout" className="size-4" />
            خروج
          </button>
        </form>
        <Link href="/guidance" className="major-office__top-exit">
          درِ دفتر
        </Link>
      </div>
    </header>
  );
}
