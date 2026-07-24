import Link from "next/link";
import {
  parseAttributionFromUnknown,
} from "@/lib/registration/attribution";
import {
  parseAppliedPromotionsFromMetadata,
  sumDiscountByType,
} from "@/lib/registration/applied-promotions";
import { parseLeadLinkFromMetadata } from "@/lib/registration/lead-link";
import { formatRials } from "@/lib/registration/format";
import { toPersianDigits } from "@/lib/persian";
import {
  REGISTRATION_PAYMENT_LABELS,
  REGISTRATION_STATUS_LABELS,
} from "@/lib/registration/status";
import type {
  RegistrationPaymentStatus,
  RegistrationStatus,
} from "@/generated/prisma/enums";

type Props = {
  metadata: unknown;
  leadId: string | null;
  discountCode: string | null;
  amountRials: number;
  discountRials: number;
  finalAmountRials: number;
  paymentStatus: RegistrationPaymentStatus;
  registrationStatus: RegistrationStatus;
  activities?: Array<{
    title: string;
    summary: string | null;
    occurredAt: Date;
    activityType: string;
  }>;
};

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/60 px-3 py-2">
      <dt className="text-[11px] text-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-medium text-foreground">
        {value}
      </dd>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-muted">{title}</h3>
      {children}
    </div>
  );
}

export function RegistrationLeadAttributionPanel({
  metadata,
  leadId,
  discountCode,
  amountRials,
  discountRials,
  finalAmountRials,
  paymentStatus,
  registrationStatus,
  activities = [],
}: Props) {
  const leadLink = parseLeadLinkFromMetadata(metadata);
  const attribution = parseAttributionFromUnknown(metadata);
  const appliedBag = parseAppliedPromotionsFromMetadata(metadata);
  const applied = appliedBag.items;

  const timedDiscount = sumDiscountByType(applied, "TIMED");
  const couponDiscount = sumDiscountByType(applied, "COUPON");
  const referralDiscount = sumDiscountByType(applied, "REFERRAL");
  const vipDiscount = sumDiscountByType(applied, "VIP");

  const resolvedLeadId = leadLink?.leadId ?? leadId;
  const promotionTimeline = activities.filter(
    (a) =>
      a.title.includes("پروموشن") ||
      a.title.toLowerCase().includes("promotion") ||
      (a.summary ?? "").includes("تخفیف"),
  );

  return (
    <section className="admin-card space-y-5 p-4 sm:p-5">
      <h2 className="text-sm font-bold text-primary">لید، منبع، قیمت و پروموشن</h2>

      <Section title="لید متصل">
        <dl className="grid gap-2 sm:grid-cols-2">
          <Info
            label="لید متصل"
            value={
              resolvedLeadId
                ? leadLink?.matchedBy
                  ? `${resolvedLeadId.slice(0, 8)}… (${leadLink.matchedBy})`
                  : `${resolvedLeadId.slice(0, 8)}…`
                : "بدون لید"
            }
          />
          <Info label="مالک لید" value={leadLink?.leadOwnerName ?? "—"} />
          <Info
            label="کارشناس مسئول"
            value={leadLink?.assignedStaffName ?? "—"}
          />
          <Info label="پایپ‌لاین" value={leadLink?.pipelineName ?? "—"} />
          <Info label="مرحله فعلی" value={leadLink?.stageName ?? "—"} />
          <Info label="منبع لید" value={leadLink?.leadSource ?? "—"} />
        </dl>
        {resolvedLeadId ? (
          <Link
            href={`/admin/leads/${resolvedLeadId}`}
            className="inline-flex text-sm font-semibold text-secondary hover:underline"
          >
            باز کردن پرونده لید
          </Link>
        ) : (
          <p className="text-sm text-muted">لیدی به این ثبت‌نام متصل نیست.</p>
        )}
      </Section>

      <Section title="Attribution">
        <dl className="grid gap-2 sm:grid-cols-2">
          <Info
            label="منبع اکتساب"
            value={
              attribution?.acquisitionSource
                ? `${attribution.acquisitionSource}${
                    attribution.acquisitionMedium
                      ? ` / ${attribution.acquisitionMedium}`
                      : ""
                  }`
                : "direct"
            }
          />
          <Info label="UTM Source" value={attribution?.utmSource ?? "—"} />
          <Info label="UTM Medium" value={attribution?.utmMedium ?? "—"} />
          <Info label="UTM Campaign" value={attribution?.utmCampaign ?? "—"} />
          <Info
            label="Landing Page"
            value={attribution?.landingPage ?? "—"}
          />
          <Info
            label="کد معرف"
            value={attribution?.referralCode ?? discountCode ?? "—"}
          />
          <Info
            label="مالک معرف"
            value={attribution?.referralOwner ?? "—"}
          />
          <Info
            label="کمپین QR"
            value={
              attribution?.qrCampaign || attribution?.qrIdentifier
                ? [attribution.qrCampaign, attribution.qrIdentifier]
                    .filter(Boolean)
                    .join(" · ")
                : "—"
            }
          />
          <Info
            label="منبع دستی"
            value={attribution?.manualSource ?? "—"}
          />
        </dl>
      </Section>

      <Section title="قیمت و تخفیف">
        <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <Info label="قیمت پایه" value={formatRials(amountRials)} />
          <Info label="تخفیف زمان‌دار" value={formatRials(timedDiscount)} />
          <Info label="کوپن" value={formatRials(couponDiscount)} />
          <Info label="معرف" value={formatRials(referralDiscount)} />
          <Info label="VIP" value={formatRials(vipDiscount)} />
          <Info label="جمع تخفیف" value={formatRials(discountRials)} />
          <Info label="مبلغ نهایی" value={formatRials(finalAmountRials)} />
          <Info
            label="وضعیت پرداخت"
            value={REGISTRATION_PAYMENT_LABELS[paymentStatus]}
          />
          <Info
            label="وضعیت ثبت‌نام"
            value={REGISTRATION_STATUS_LABELS[registrationStatus]}
          />
        </dl>
      </Section>

      <Section title="پروموشن‌های اعمال‌شده">
        {applied.length === 0 ? (
          <p className="text-sm text-muted">پروموشنی اعمال نشده است.</p>
        ) : (
          <ul className="space-y-2">
            {applied.map((item, index) => (
              <li
                key={`${item.promotionId || item.code || item.title}-${index}`}
                className="rounded-xl border border-border px-3 py-2 text-sm"
              >
                <span className="font-medium">{item.title}</span>
                <span className="ms-2 text-xs text-muted">{item.type}</span>
                {item.code ? (
                  <span className="ms-2 font-mono text-xs" dir="ltr">
                    {item.code}
                  </span>
                ) : null}
                <span className="mt-1 block text-xs text-muted">
                  تخفیف: {formatRials(item.discountAmountRials)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="تایم‌لاین پروموشن / ثبت‌نام">
        {promotionTimeline.length === 0 && activities.length === 0 ? (
          <p className="text-sm text-muted">رویدادی ثبت نشده است.</p>
        ) : (
          <ul className="space-y-2">
            {(promotionTimeline.length > 0
              ? promotionTimeline
              : activities.slice(0, 8)
            ).map((item, index) => (
              <li
                key={`${item.title}-${index}`}
                className="rounded-xl border border-border/70 px-3 py-2 text-sm"
              >
                <p className="font-medium">{item.title}</p>
                {item.summary ? (
                  <p className="mt-0.5 text-xs text-muted">{item.summary}</p>
                ) : null}
                <p className="mt-1 text-[11px] text-muted">
                  {toPersianDigits(item.occurredAt.toISOString().slice(0, 16))}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </section>
  );
}
