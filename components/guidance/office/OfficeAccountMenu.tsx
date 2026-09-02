import Link from "next/link";

function firstName(full: string): string {
  const part = full.trim().split(/\s+/).filter(Boolean)[0];
  return part && part !== "داوطلب" ? part : full;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "د";
  if (parts.length === 1) return parts[0]!.slice(0, 1);
  return `${parts[0]!.slice(0, 1)}${parts[1]!.slice(0, 1)}`;
}

/**
 * Account menu — profile + existing POST logout. No new auth logic.
 */
export function OfficeAccountMenu({
  userDisplayName,
}: {
  userDisplayName: string;
}) {
  const display = firstName(userDisplayName);

  return (
    <div className="guidance-command-account">
      <details className="guidance-command-account__details">
        <summary className="guidance-command-account__trigger">
          <span className="guidance-command-account__avatar" aria-hidden="true">
            {initials(userDisplayName)}
          </span>
          <span className="guidance-command-account__name">{display}</span>
        </summary>
        <div className="guidance-command-account__panel">
          <p className="guidance-command-account__full">{userDisplayName}</p>
          <Link href="/portal/student/profile">حساب کاربری / پروفایل</Link>
        </div>
      </details>

      <Link
        href="/portal/student/profile"
        className="guidance-command-account__profile-link"
      >
        پروفایل
      </Link>

      <form action="/portal/logout" method="post" className="guidance-command-account__logout">
        <input type="hidden" name="next" value="/guidance" />
        <button type="submit">خروج از حساب</button>
      </form>
    </div>
  );
}
