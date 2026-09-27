import { redirect } from "next/navigation";
import { AcademyShell } from "@/components/academy/AcademyShell";
import { requireAcademySession } from "@/lib/academy/auth/session";
import { getAcademyOrganizationId } from "@/lib/academy/config";
import { revokeAcademyDeviceAction } from "@/app/academy/account/devices/actions";
import { listUserDevices } from "@/lib/academy/devices";

export default async function AcademyDevicesPage() {
  const session = await requireAcademySession().catch(() => null);
  if (!session) redirect("/login?next=/account/devices");

  const organizationId = await getAcademyOrganizationId();
  const devices = await listUserDevices({
    organizationId,
    userId: session.userId,
  });

  return (
    <AcademyShell>
      <div className="mx-auto max-w-lg px-4 py-12" dir="rtl">
        <h1 className="text-xl font-bold">دستگاه‌های من</h1>
        <ul className="mt-6 space-y-3">
          {devices.map((d) => (
            <li key={d.id} className="academy-card flex items-center justify-between p-4 text-sm">
              <div>
                <p>{d.browserLabel ?? "مرورگر"} — {d.osLabel ?? ""}</p>
                <p className="text-xs text-muted">
                  آخرین بازدید: {d.lastSeenAt.toLocaleDateString("fa-IR")}
                </p>
              </div>
              {!d.revokedAt ? (
                <form action={revokeAcademyDeviceAction}>
                  <input type="hidden" name="deviceId" value={d.id} />
                  <button type="submit" className="text-danger text-xs">
                    لغو
                  </button>
                </form>
              ) : (
                <span className="text-xs text-muted">لغو شده</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </AcademyShell>
  );
}
