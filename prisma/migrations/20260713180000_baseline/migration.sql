-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'NO_ANSWER', 'CONSULTATION_SCHEDULED', 'WAITING_FOR_DECISION', 'WAITING_FOR_PAYMENT', 'ENROLLED', 'LOST');

-- CreateEnum
CREATE TYPE "LeadActivityType" AS ENUM ('NOTE', 'CALL', 'STATUS_CHANGE', 'ASSIGNMENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('PRE_REGISTRATION', 'DATA_PROCESSING', 'MARKETING_CONTACT');

-- CreateEnum
CREATE TYPE "ServiceInterest" AS ENUM ('COURSES', 'CLASSES', 'EXAMS', 'CONSULTATION', 'UNDECIDED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'UNSPECIFIED');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED', 'DISABLED');

-- CreateEnum
CREATE TYPE "SystemRole" AS ENUM ('PLATFORM_ADMIN', 'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'BRANCH_MANAGER', 'ADVISOR', 'TEACHER', 'FINANCE', 'REGISTRATION_STAFF', 'SUPPORT', 'CONTENT_MANAGER', 'STUDENT', 'PARENT');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED', 'REVOKED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('USER_CREATED', 'USER_UPDATED', 'MEMBERSHIP_CREATED', 'MEMBERSHIP_UPDATED', 'ROLE_CHANGED', 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'LEAD_VIEWED', 'LEAD_UPDATED', 'DATA_EXPORTED', 'SECURITY_EVENT');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "legalName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "city" TEXT,
    "province" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "mobile" TEXT,
    "normalizedMobile" TEXT,
    "passwordHash" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'INVITED',
    "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" TIMESTAMP(3),
    "mobileVerifiedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_memberships" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "SystemRole" NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'INVITED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "organization_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch_memberships" (
    "id" TEXT NOT NULL,
    "organizationMembershipId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "branch_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "branchId" TEXT,
    "actorUserId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "fatherName" TEXT,
    "mobile" TEXT NOT NULL,
    "mobileRaw" TEXT NOT NULL,
    "school" TEXT,
    "gradeLevel" TEXT,
    "studyField" TEXT,
    "city" TEXT,
    "province" TEXT,
    "gender" "Gender",
    "birthDate" DATE,
    "nationalCode" TEXT,
    "serviceInterest" "ServiceInterest" NOT NULL DEFAULT 'UNDECIDED',
    "description" TEXT,
    "source" TEXT NOT NULL DEFAULT 'WEB_PRE_REGISTRATION',
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "duplicateOfId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_activities" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "type" "LeadActivityType" NOT NULL,
    "content" TEXT NOT NULL,
    "previousStatus" "LeadStatus",
    "newStatus" "LeadStatus",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_records" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "consentType" "ConsentType" NOT NULL,
    "consentText" TEXT NOT NULL,
    "consentVersion" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "branches_organizationId_isActive_idx" ON "branches"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "branches_organizationId_deletedAt_idx" ON "branches"("organizationId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "branches_organizationId_slug_key" ON "branches"("organizationId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "branches_organizationId_id_key" ON "branches"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_normalizedMobile_key" ON "users"("normalizedMobile");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");

-- CreateIndex
CREATE INDEX "users_isPlatformAdmin_idx" ON "users"("isPlatformAdmin");

-- CreateIndex
CREATE INDEX "organization_memberships_organizationId_status_idx" ON "organization_memberships"("organizationId", "status");

-- CreateIndex
CREATE INDEX "organization_memberships_organizationId_role_idx" ON "organization_memberships"("organizationId", "role");

-- CreateIndex
CREATE INDEX "organization_memberships_organizationId_deletedAt_idx" ON "organization_memberships"("organizationId", "deletedAt");

-- CreateIndex
CREATE INDEX "organization_memberships_userId_status_idx" ON "organization_memberships"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "organization_memberships_organizationId_userId_key" ON "organization_memberships"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_memberships_organizationId_id_key" ON "organization_memberships"("organizationId", "id");

-- CreateIndex
CREATE INDEX "branch_memberships_organizationId_branchId_idx" ON "branch_memberships"("organizationId", "branchId");

-- CreateIndex
CREATE INDEX "branch_memberships_organizationId_organizationMembershipId_idx" ON "branch_memberships"("organizationId", "organizationMembershipId");

-- CreateIndex
CREATE INDEX "branch_memberships_organizationId_deletedAt_idx" ON "branch_memberships"("organizationId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "branch_memberships_organizationMembershipId_branchId_key" ON "branch_memberships"("organizationMembershipId", "branchId");

-- CreateIndex
CREATE INDEX "audit_logs_organizationId_createdAt_idx" ON "audit_logs"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_branchId_createdAt_idx" ON "audit_logs"("branchId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_actorUserId_createdAt_idx" ON "audit_logs"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_action_createdAt_idx" ON "audit_logs"("action", "createdAt");

-- CreateIndex
CREATE INDEX "leads_organizationId_branchId_idx" ON "leads"("organizationId", "branchId");

-- CreateIndex
CREATE INDEX "leads_organizationId_status_idx" ON "leads"("organizationId", "status");

-- CreateIndex
CREATE INDEX "leads_organizationId_mobile_idx" ON "leads"("organizationId", "mobile");

-- CreateIndex
CREATE INDEX "leads_organizationId_createdAt_idx" ON "leads"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "leads_organizationId_deletedAt_idx" ON "leads"("organizationId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "leads_organizationId_branchId_id_key" ON "leads"("organizationId", "branchId", "id");

-- CreateIndex
CREATE INDEX "lead_activities_organizationId_branchId_idx" ON "lead_activities"("organizationId", "branchId");

-- CreateIndex
CREATE INDEX "lead_activities_organizationId_leadId_createdAt_idx" ON "lead_activities"("organizationId", "leadId", "createdAt");

-- CreateIndex
CREATE INDEX "consent_records_organizationId_branchId_idx" ON "consent_records"("organizationId", "branchId");

-- CreateIndex
CREATE INDEX "consent_records_organizationId_leadId_idx" ON "consent_records"("organizationId", "leadId");

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_memberships" ADD CONSTRAINT "branch_memberships_organizationId_organizationMembershipId_fkey" FOREIGN KEY ("organizationId", "organizationMembershipId") REFERENCES "organization_memberships"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_memberships" ADD CONSTRAINT "branch_memberships_organizationId_branchId_fkey" FOREIGN KEY ("organizationId", "branchId") REFERENCES "branches"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organizationId_branchId_fkey" FOREIGN KEY ("organizationId", "branchId") REFERENCES "branches"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_organizationId_branchId_fkey" FOREIGN KEY ("organizationId", "branchId") REFERENCES "branches"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_organizationId_branchId_leadId_fkey" FOREIGN KEY ("organizationId", "branchId", "leadId") REFERENCES "leads"("organizationId", "branchId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_organizationId_branchId_fkey" FOREIGN KEY ("organizationId", "branchId") REFERENCES "branches"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_organizationId_branchId_leadId_fkey" FOREIGN KEY ("organizationId", "branchId", "leadId") REFERENCES "leads"("organizationId", "branchId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_organizationId_branchId_fkey" FOREIGN KEY ("organizationId", "branchId") REFERENCES "branches"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
