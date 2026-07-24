-- Public tracking codes for FormSubmission + Registration (Phase B)

ALTER TABLE "form_submissions" ADD COLUMN "trackingCode" TEXT;

CREATE UNIQUE INDEX "form_submissions_organizationId_trackingCode_key" ON "form_submissions"("organizationId", "trackingCode");
CREATE INDEX "form_submissions_organizationId_trackingCode_idx" ON "form_submissions"("organizationId", "trackingCode");

ALTER TABLE "registrations" ADD COLUMN "publicTrackingCode" TEXT;

CREATE UNIQUE INDEX "registrations_organizationId_publicTrackingCode_key" ON "registrations"("organizationId", "publicTrackingCode");
CREATE INDEX "registrations_organizationId_publicTrackingCode_idx" ON "registrations"("organizationId", "publicTrackingCode");
