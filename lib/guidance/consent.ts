/**
 * Guidance ERP — pre-registration consent copy (Phase 0).
 *
 * Phase 0 stores consent attestation on GuidancePlan (consentGrantedAt /
 * consentVersion / consentText). CRM ConsentRecord is Lead-scoped and is not
 * used here (no CRM Lead writes in P0).
 *
 * FUTURE MIGRATION PATH (do not implement yet):
 * 1. Introduce party-scoped platform consent (User/Student/Guardian), or extend
 *    ConsentRecord beyond Lead with a polymorphic subject.
 * 2. Backfill GuidancePlan consent snapshots into the platform store.
 * 3. Keep plan fields as immutable evidence OR replace with FK to consent rows.
 * 4. Preserve AuditLog trails across the cutover.
 */

export const GUIDANCE_PRE_REG_CONSENT_VERSION = "guidance-pre-reg-v1" as const;

export const GUIDANCE_PRE_REG_CONSENT_TEXT =
  "با ثبت پیش‌ثبت‌نام در سامانه جامع انتخاب رشته، با پردازش اطلاعات هویتی و تحصیلی‌ام برای تشکیل پرونده انتخاب رشته و پیگیری مسیر مشاوره در ستارگان پلاس موافقت می‌کنم." as const;
