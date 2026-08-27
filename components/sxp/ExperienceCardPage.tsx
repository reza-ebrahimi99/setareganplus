import { PortalEmptyState } from "@/components/portal/PortalEmptyState";
import { ExperienceStudentCardView } from "@/components/sxp/ExperienceStudentCardView";
import type { ExperienceCardPageDto } from "@/lib/sxp/hub/load-card";

type ExperienceCardPageProps = {
  page: ExperienceCardPageDto;
};

export function ExperienceCardPage({ page }: ExperienceCardPageProps) {
  return (
    <div className="mx-auto w-full max-w-[840px] space-y-6">
      <div>
        <h1 className="text-xl font-bold text-primary sm:text-2xl">
          کارت دیجیتال
        </h1>
        <p className="mt-1 text-sm text-muted">
          هویت پرتال {page.displayName} در {page.organizationName}
        </p>
      </div>

      {page.cards.length === 0 ? (
        <PortalEmptyState
          title="کارت هنوز ساخته نشده"
          description="وقتی دانش‌آموز مجاز به حساب شما وصل شود، کارت دیجیتال اینجا دیده می‌شود."
        />
      ) : (
        <div className="space-y-5">
          {page.cards.map((card) => (
            <ExperienceStudentCardView key={card.studentId} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}
