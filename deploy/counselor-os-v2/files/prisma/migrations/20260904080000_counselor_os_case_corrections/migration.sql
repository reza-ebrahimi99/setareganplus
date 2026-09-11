-- Counselor OS v2 — additive correction audit only.

CREATE TABLE "counselor_case_corrections" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "counselorUserId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "fieldLabel" TEXT NOT NULL,
    "previousValue" TEXT NOT NULL,
    "newValue" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "counselor_case_corrections_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "cos_corr_org_stu_at_idx" ON "counselor_case_corrections"("organizationId", "studentId", "createdAt");
CREATE INDEX "cos_corr_org_user_idx" ON "counselor_case_corrections"("organizationId", "counselorUserId");

ALTER TABLE "counselor_case_corrections" ADD CONSTRAINT "counselor_case_corrections_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "counselor_case_corrections" ADD CONSTRAINT "counselor_case_corrections_org_student_fkey" FOREIGN KEY ("organizationId", "studentId") REFERENCES "students"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "counselor_case_corrections" ADD CONSTRAINT "counselor_case_corrections_counselorUserId_fkey" FOREIGN KEY ("counselorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
