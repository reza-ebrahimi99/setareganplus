import Link from "next/link";
import { leadDetailUnavailable } from "@/content/admin";
import { AdminEmptyState } from "./AdminEmptyState";

export function LeadDetailEmpty() {
  return (
    <AdminEmptyState
      title={leadDetailUnavailable.title}
      description={leadDetailUnavailable.description}
      action={
        <Link
          href={leadDetailUnavailable.backHref}
          className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
        >
          {leadDetailUnavailable.backLabel}
        </Link>
      }
    />
  );
}
