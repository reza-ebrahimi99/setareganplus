import Image from "next/image";
import Link from "next/link";
import { OfficeAccountMenu } from "@/components/guidance/office/OfficeAccountMenu";
import { MAJOR_OFFICE_HOME } from "@/lib/guidance/office/nav";

export function OfficeTopBar({
  userDisplayName,
  statusLabel,
}: {
  userDisplayName: string;
  statusLabel: string;
}) {
  return (
    <header className="guidance-command-header">
      <div className="guidance-command-header__inner">
        <Link href={MAJOR_OFFICE_HOME} className="guidance-command-header__brand">
          <Image
            src="/images/brand/logo.png"
            alt="ستارگان پلاس"
            width={108}
            height={36}
            className="guidance-command-header__logo"
            priority
          />
          <span className="guidance-command-header__brand-text">ستارگان پلاس</span>
        </Link>

        <div className="guidance-command-header__center">
          <p className="guidance-command-header__title">
            سامانه جامع انتخاب رشته ستارگان پلاس
          </p>
          <p className="guidance-command-header__status">{statusLabel}</p>
        </div>

        <OfficeAccountMenu userDisplayName={userDisplayName} />
      </div>
    </header>
  );
}
