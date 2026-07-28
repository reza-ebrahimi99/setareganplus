import {
  ExperienceOwnerType,
  ExperiencePurpose,
} from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  failResult,
  okResult,
  type ExperienceResult,
} from "@/lib/experience/service/types";

export type SupportedExperienceOwner = {
  ownerType: typeof ExperienceOwnerType.REGISTRATION_FLOW;
  ownerId: string;
  purpose: typeof ExperiencePurpose.LANDING;
};

type Tx = Prisma.TransactionClient | typeof prisma;

/**
 * Sprint A runtime: only REGISTRATION_FLOW + LANDING.
 * Other enum values remain reserved in the database.
 */
export function assertSupportedOwnerPurpose(params: {
  ownerType: string;
  purpose: string;
}): ExperienceResult<SupportedExperienceOwner> {
  if (params.ownerType !== ExperienceOwnerType.REGISTRATION_FLOW) {
    return failResult(
      "UNSUPPORTED_OWNER",
      "در اسپرینت فعلی فقط مالک REGISTRATION_FLOW پشتیبانی می‌شود.",
    );
  }
  if (params.purpose !== ExperiencePurpose.LANDING) {
    return failResult(
      "UNSUPPORTED_PURPOSE",
      "در اسپرینت فعلی فقط هدف LANDING پشتیبانی می‌شود.",
    );
  }
  return okResult({
    ownerType: ExperienceOwnerType.REGISTRATION_FLOW,
    ownerId: "",
    purpose: ExperiencePurpose.LANDING,
  });
}

export async function assertRegistrationFlowOwner(params: {
  organizationId: string;
  ownerId: string;
  tx?: Tx;
}): Promise<
  ExperienceResult<{
    flowId: string;
    organizationId: string;
    title: string;
    slug: string;
  }>
> {
  const db = params.tx ?? prisma;
  const flow = await db.registrationFlow.findFirst({
    where: {
      id: params.ownerId,
      deletedAt: null,
    },
    select: {
      id: true,
      organizationId: true,
      title: true,
      slug: true,
    },
  });

  if (!flow) {
    return failResult(
      "OWNER_NOT_FOUND",
      "جریان ثبت‌نام مالک این تجربه یافت نشد.",
    );
  }

  if (flow.organizationId !== params.organizationId) {
    return failResult(
      "OWNER_ORG_MISMATCH",
      "جریان ثبت‌نام به سازمان دیگری تعلق دارد.",
    );
  }

  return okResult({
    flowId: flow.id,
    organizationId: flow.organizationId,
    title: flow.title,
    slug: flow.slug,
  });
}

export async function resolveSupportedOwner(params: {
  organizationId: string;
  ownerType: string;
  ownerId: string;
  purpose: string;
  tx?: Tx;
}): Promise<
  ExperienceResult<{
    ownerType: typeof ExperienceOwnerType.REGISTRATION_FLOW;
    ownerId: string;
    purpose: typeof ExperiencePurpose.LANDING;
    flowTitle: string;
    flowSlug: string;
  }>
> {
  const supported = assertSupportedOwnerPurpose(params);
  if (!supported.ok) return supported;

  const owner = await assertRegistrationFlowOwner({
    organizationId: params.organizationId,
    ownerId: params.ownerId,
    tx: params.tx,
  });
  if (!owner.ok) return owner;

  return okResult({
    ownerType: ExperienceOwnerType.REGISTRATION_FLOW,
    ownerId: owner.data.flowId,
    purpose: ExperiencePurpose.LANDING,
    flowTitle: owner.data.title,
    flowSlug: owner.data.slug,
  });
}
