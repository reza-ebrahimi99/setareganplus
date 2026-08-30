-- CreateEnum
CREATE TYPE "GuidanceQuota" AS ENUM ('NORMAL', 'VETERAN_5', 'VETERAN_25', 'VETERAN_FAMILY', 'COMBATANT_FAMILY', 'DISABLED', 'REMOTE_REGION', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'GUIDANCE_STEP_ADVANCED';
ALTER TYPE "AuditAction" ADD VALUE 'GUIDANCE_PAYMENT_STARTED';
ALTER TYPE "AuditAction" ADD VALUE 'GUIDANCE_PAYMENT_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE 'GUIDANCE_BOOKING_RESERVED';
ALTER TYPE "AuditAction" ADD VALUE 'GUIDANCE_MAJOR_CHOICES_IMPORTED';
ALTER TYPE "AuditAction" ADD VALUE 'GUIDANCE_MAJOR_CHOICES_APPROVED';
ALTER TYPE "AuditAction" ADD VALUE 'GUIDANCE_JOURNEY_APPROVED';

-- AlterEnum
ALTER TYPE "GuidanceDocumentType" ADD VALUE 'EXAM_RESULT';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "GuidancePlanStatus" ADD VALUE 'STEP1_COMPLETED';
ALTER TYPE "GuidancePlanStatus" ADD VALUE 'STEP2_COMPLETED';
ALTER TYPE "GuidancePlanStatus" ADD VALUE 'STEP3_COMPLETED';
ALTER TYPE "GuidancePlanStatus" ADD VALUE 'STEP4_COMPLETED';
ALTER TYPE "GuidancePlanStatus" ADD VALUE 'STEP5_COMPLETED';
ALTER TYPE "GuidancePlanStatus" ADD VALUE 'STEP6_COMPLETED';
ALTER TYPE "GuidancePlanStatus" ADD VALUE 'STEP7_COMPLETED';
ALTER TYPE "GuidancePlanStatus" ADD VALUE 'STEP8_COMPLETED';
ALTER TYPE "GuidancePlanStatus" ADD VALUE 'STEP9_COMPLETED';
ALTER TYPE "GuidancePlanStatus" ADD VALUE 'STEP10_COMPLETED';
ALTER TYPE "GuidancePlanStatus" ADD VALUE 'STEP11_COMPLETED';
ALTER TYPE "GuidancePlanStatus" ADD VALUE 'STEP12_COMPLETED';

-- AlterEnum
ALTER TYPE "PaymentPayableType" ADD VALUE 'GUIDANCE_PACKAGE';

-- AlterTable
ALTER TABLE "commerce_notification_settings" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "guidance_plans" ADD COLUMN     "choicesApprovedAt" TIMESTAMP(3),
ADD COLUMN     "choicesApprovedByUserId" TEXT,
ADD COLUMN     "completedSteps" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "completionPercentage" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "currentStep" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "finalApprovedAt" TIMESTAMP(3),
ADD COLUMN     "guidancePackageCode" TEXT,
ADD COLUMN     "highSchoolAverage" DOUBLE PRECISION,
ADD COLUMN     "packagePaidAt" TIMESTAMP(3),
ADD COLUMN     "personalInfoConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "quota" "GuidanceQuota";

-- CreateIndex
CREATE INDEX "guidance_plans_choicesApprovedByUserId_idx" ON "guidance_plans"("choicesApprovedByUserId");

-- RenameForeignKey
ALTER TABLE "commerce_orders" RENAME CONSTRAINT "commerce_orders_pickupBranch_fkey" TO "commerce_orders_organizationId_pickupBranchId_fkey";

-- RenameForeignKey
ALTER TABLE "registration_flow_document_requirements" RENAME CONSTRAINT "registration_flow_document_requirements_organizationId_flowId_f" TO "registration_flow_document_requirements_organizationId_flo_fkey";

-- AddForeignKey
ALTER TABLE "guidance_plans" ADD CONSTRAINT "guidance_plans_choicesApprovedByUserId_fkey" FOREIGN KEY ("choicesApprovedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "achievements_organizationId_isPublished_archivedAt_deletedAt_ac" RENAME TO "achievements_organizationId_isPublished_archivedAt_deletedA_idx";

-- RenameIndex
ALTER INDEX "achievements_organizationId_showInAchievementGallery_featuredPr" RENAME TO "achievements_organizationId_showInAchievementGallery_featur_idx";

-- RenameIndex
ALTER INDEX "achievements_organizationId_showInAchievementHero_featuredPrior" RENAME TO "achievements_organizationId_showInAchievementHero_featuredP_idx";

-- RenameIndex
ALTER INDEX "achievements_organizationId_showInHomepageSlider_featuredPriori" RENAME TO "achievements_organizationId_showInHomepageSlider_featuredPr_idx";

-- RenameIndex
ALTER INDEX "achievements_organizationId_showInHomepageTicker_featuredPriori" RENAME TO "achievements_organizationId_showInHomepageTicker_featuredPr_idx";

-- RenameIndex
ALTER INDEX "assessments_organizationId_isPublished_archivedAt_deletedAt_ass" RENAME TO "assessments_organizationId_isPublished_archivedAt_deletedAt_idx";

-- RenameIndex
ALTER INDEX "assessments_organizationId_isPublished_publishFeaturedResults_a" RENAME TO "assessments_organizationId_isPublished_publishFeaturedResul_idx";

-- RenameIndex
ALTER INDEX "attribution_snapshots_organizationId_attributedUserId_attribute" RENAME TO "attribution_snapshots_organizationId_attributedUserId_attri_idx";

-- RenameIndex
ALTER INDEX "automation_executions_organizationId_automationRuleId_domainEve" RENAME TO "automation_executions_organizationId_automationRuleId_domai_key";

-- RenameIndex
ALTER INDEX "booking_availability_exceptions_organizationId_advisorId_localD" RENAME TO "booking_availability_exceptions_organizationId_advisorId_lo_idx";

-- RenameIndex
ALTER INDEX "booking_availability_exceptions_organizationId_serviceId_localD" RENAME TO "booking_availability_exceptions_organizationId_serviceId_lo_idx";

-- RenameIndex
ALTER INDEX "booking_availability_rules_organizationId_advisorId_weekday_isA" RENAME TO "booking_availability_rules_organizationId_advisorId_weekday_idx";

-- RenameIndex
ALTER INDEX "booking_reservations_organizationId_normalizedNationalId_status" RENAME TO "booking_reservations_organizationId_normalizedNationalId_st_idx";

-- RenameIndex
ALTER INDEX "commerce_business_types_organizationId_isActive_deletedAt_sortO" RENAME TO "commerce_business_types_organizationId_isActive_deletedAt_s_idx";

-- RenameIndex
ALTER INDEX "commerce_categories_organizationId_isActive_isVisible_deletedAt" RENAME TO "commerce_categories_organizationId_isActive_isVisible_delet_idx";

-- RenameIndex
ALTER INDEX "commerce_item_categories_organizationId_categoryId_sortOrder_id" RENAME TO "commerce_item_categories_organizationId_categoryId_sortOrde_idx";

-- RenameIndex
ALTER INDEX "crm_lead_import_reports_organizationId_importedByUserId_created" RENAME TO "crm_lead_import_reports_organizationId_importedByUserId_cre_idx";

-- RenameIndex
ALTER INDEX "experience_engine_inbox_organizationId_outboxEventId_handlerNam" RENAME TO "experience_engine_inbox_organizationId_outboxEventId_handle_key";

-- RenameIndex
ALTER INDEX "experience_timeline_events_organizationId_userId_feedEligible_f" RENAME TO "experience_timeline_events_organizationId_userId_feedEligib_idx";

-- RenameIndex
ALTER INDEX "experience_timeline_events_organizationId_userId_sourceEventId_" RENAME TO "experience_timeline_events_organizationId_userId_sourceEven_key";

-- RenameIndex
ALTER INDEX "experience_timeline_events_organizationId_userId_visibility_occ" RENAME TO "experience_timeline_events_organizationId_userId_visibility_idx";

-- RenameIndex
ALTER INDEX "guidance_documents_organizationId_planId_documentType_isLatest_" RENAME TO "guidance_documents_organizationId_planId_documentType_isLat_idx";

-- RenameIndex
ALTER INDEX "guidance_documents_organizationId_planId_documentType_versionNu" RENAME TO "guidance_documents_organizationId_planId_documentType_versi_key";

-- RenameIndex
ALTER INDEX "lead_ownership_histories_organizationId_leadId_effectiveFrom_id" RENAME TO "lead_ownership_histories_organizationId_leadId_effectiveFro_idx";

-- RenameIndex
ALTER INDEX "lead_ownership_histories_organizationId_ownerUserId_effectiveFr" RENAME TO "lead_ownership_histories_organizationId_ownerUserId_effecti_idx";

-- RenameIndex
ALTER INDEX "media_placements_organizationId_placementKey_deletedAt_isActive" RENAME TO "media_placements_organizationId_placementKey_deletedAt_isAc_idx";

-- RenameIndex
ALTER INDEX "otp_challenges_organizationId_normalizedMobile_purpose_status_i" RENAME TO "otp_challenges_organizationId_normalizedMobile_purpose_stat_idx";

-- RenameIndex
ALTER INDEX "portal_account_links_organizationId_userId_deletedAt_isActive_i" RENAME TO "portal_account_links_organizationId_userId_deletedAt_isActi_idx";

-- RenameIndex
ALTER INDEX "registration_activities_organizationId_activityType_occurredAt_" RENAME TO "registration_activities_organizationId_activityType_occurre_idx";

-- RenameIndex
ALTER INDEX "registration_activities_organizationId_registrationId_occurredA" RENAME TO "registration_activities_organizationId_registrationId_occur_idx";

-- RenameIndex
ALTER INDEX "registration_documents_organizationId_registrationId_documentTy" RENAME TO "registration_documents_organizationId_registrationId_docume_idx";

-- RenameIndex
ALTER INDEX "registration_flow_document_requirements_flowId_requirementKey_k" RENAME TO "registration_flow_document_requirements_flowId_requirementK_key";

-- RenameIndex
ALTER INDEX "registration_flow_document_requirements_organizationId_deletedA" RENAME TO "registration_flow_document_requirements_organizationId_dele_idx";

-- RenameIndex
ALTER INDEX "registration_flow_document_requirements_organizationId_flowId_s" RENAME TO "registration_flow_document_requirements_organizationId_flow_idx";

-- RenameIndex
ALTER INDEX "registration_flow_gallery_items_organizationId_flowId_sortOrder" RENAME TO "registration_flow_gallery_items_organizationId_flowId_sortO_idx";

-- RenameIndex
ALTER INDEX "registration_flow_item_variants_organizationId_itemId_sortOrder" RENAME TO "registration_flow_item_variants_organizationId_itemId_sortO_idx";

-- RenameIndex
ALTER INDEX "registration_flow_items_organizationId_flowId_isActive_deletedA" RENAME TO "registration_flow_items_organizationId_flowId_isActive_dele_idx";

-- RenameIndex
ALTER INDEX "student_guardian_relations_organizationId_guardianId_deletedAt_" RENAME TO "student_guardian_relations_organizationId_guardianId_delete_idx";

-- RenameIndex
ALTER INDEX "student_guardian_relations_organizationId_studentId_deletedAt_i" RENAME TO "student_guardian_relations_organizationId_studentId_deleted_idx";

-- RenameIndex
ALTER INDEX "student_guardian_relations_organizationId_studentId_guardianId_" RENAME TO "student_guardian_relations_organizationId_studentId_guardia_key";

-- RenameIndex
ALTER INDEX "students_organizationId_isActive_archivedAt_deletedAt_displayOr" RENAME TO "students_organizationId_isActive_archivedAt_deletedAt_displ_idx";

-- RenameIndex
ALTER INDEX "team_members_organizationId_isActive_archivedAt_deletedAt_displ" RENAME TO "team_members_organizationId_isActive_archivedAt_deletedAt_d_idx";

-- RenameIndex
ALTER INDEX "website_marketing_cards_organizationId_sectionKey_deletedAt_isA" RENAME TO "website_marketing_cards_organizationId_sectionKey_deletedAt_idx";

-- RenameIndex
ALTER INDEX "website_page_sections_organizationId_pageId_deletedAt_status_so" RENAME TO "website_page_sections_organizationId_pageId_deletedAt_statu_idx";
