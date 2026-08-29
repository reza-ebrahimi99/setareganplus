/**
 * One-time / recovery bootstrap for the first StarOS admin.
 *
 * Usage (VPS or local, after migrate deploy):
 *
 *   set ADMIN_EMAIL=reza@example.com
 *   set ADMIN_PASSWORD=<strong-secret>
 *   set ADMIN_ORG_SLUG=setareganplus
 *   set ADMIN_FIRST_NAME=رضا
 *   set ADMIN_LAST_NAME=مدیر
 *   npm run auth:bootstrap-admin
 *
 * Optional: ADMIN_MOBILE=0912xxxxxxx
 *
 * Never commit real passwords. Rotate after first login if shared via chat.
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import {
  MembershipStatus,
  SystemRole,
  UserStatus,
} from "../generated/prisma/enums";
import { hashPassword } from "../lib/auth/crypto";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const passwordValue = process.env.ADMIN_PASSWORD;
const orgSlug = process.env.ADMIN_ORG_SLUG?.trim() || "setareganplus";
const firstName = process.env.ADMIN_FIRST_NAME?.trim() || "مدیر";
const lastName = process.env.ADMIN_LAST_NAME?.trim() || "سیستم";
const mobileRaw = process.env.ADMIN_MOBILE?.trim();

if (!email || !passwordValue || passwordValue.length < 12) {
  console.error(
    "Set ADMIN_EMAIL and ADMIN_PASSWORD (min 12 chars). Optional: ADMIN_ORG_SLUG, ADMIN_FIRST_NAME, ADMIN_LAST_NAME, ADMIN_MOBILE.",
  );
  process.exit(1);
}

const password = passwordValue;

function normalizeMobile(raw: string | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return null;
  if (digits.startsWith("98") && digits.length >= 12) {
    return `0${digits.slice(2)}`;
  }
  if (digits.startsWith("9") && digits.length === 10) {
    return `0${digits}`;
  }
  return digits.startsWith("0") ? digits : raw;
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const organization = await prisma.organization.findFirst({
    where: { slug: orgSlug, deletedAt: null, isActive: true },
    select: { id: true, slug: true, name: true },
  });

  if (!organization) {
    throw new Error(
      `Organization slug "${orgSlug}" not found. Run db:seed first.`,
    );
  }

  const normalizedMobile = normalizeMobile(mobileRaw);
  const passwordHash = hashPassword(password);

  const existing = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      OR: [
        { email },
        ...(normalizedMobile ? [{ normalizedMobile }] : []),
      ],
    },
    select: { id: true },
  });

  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: {
          email,
          mobile: mobileRaw ?? undefined,
          normalizedMobile: normalizedMobile ?? undefined,
          passwordHash,
          firstName,
          lastName,
          status: UserStatus.ACTIVE,
          deletedAt: null,
        },
        select: { id: true, email: true },
      })
    : await prisma.user.create({
        data: {
          email,
          mobile: mobileRaw ?? null,
          normalizedMobile,
          passwordHash,
          firstName,
          lastName,
          status: UserStatus.ACTIVE,
        },
        select: { id: true, email: true },
      });

  const membership = await prisma.organizationMembership.findFirst({
    where: {
      organizationId: organization.id,
      userId: user.id,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (membership) {
    await prisma.organizationMembership.update({
      where: { id: membership.id },
      data: {
        role: SystemRole.ORGANIZATION_OWNER,
        status: MembershipStatus.ACTIVE,
      },
    });
  } else {
    await prisma.organizationMembership.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        role: SystemRole.ORGANIZATION_OWNER,
        status: MembershipStatus.ACTIVE,
      },
    });
  }

  console.log(
    `Admin ready: ${user.email} → org ${organization.slug} (${organization.name}) as ORGANIZATION_OWNER`,
  );
  console.log("Password was set from ADMIN_PASSWORD (not printed).");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error instanceof Error ? error.message : error);
    await prisma.$disconnect();
    process.exit(1);
  });
