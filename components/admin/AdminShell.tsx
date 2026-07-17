import { AdminHeader } from "./AdminHeader";
import { AdminSidebar } from "./AdminSidebar";

type AdminShellProps = {
  children: React.ReactNode;
  userDisplayName: string;
  organizationName: string;
  permissions: readonly string[];
};

export function AdminShell({
  children,
  userDisplayName,
  organizationName,
  permissions,
}: AdminShellProps) {
  return (
    <div className="flex min-h-full min-w-0 flex-col lg:flex-row">
      <a
        href="#admin-main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
      >
        پرش به محتوای مدیریت
      </a>
      <AdminSidebar permissions={permissions} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader
          userDisplayName={userDisplayName}
          organizationName={organizationName}
        />
        <main
          id="admin-main-content"
          className="admin-main min-w-0 max-w-full flex-1 overflow-x-clip px-4 py-6 sm:px-6 lg:py-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
