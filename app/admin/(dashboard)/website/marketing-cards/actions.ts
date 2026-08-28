"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";
import {
  HOMEPAGE_QALAMCHI_SECTION_KEY,
  MARKETING_CARD_BADGE_MAX,
  MARKETING_CARD_DESCRIPTION_MAX,
  MARKETING_CARD_IMAGE_ALT_MAX,
  MARKETING_CARD_TITLE_MAX,
  isMarketingCardSectionKey,
  normalizeMarketingCardText,
} from "@/lib/website/marketing-card-constants";
import {
  buildMarketingCardCreateData,
  buildMarketingCardUpdateData,
  nextMarketingCardSortOrder,
  type MarketingCardWriteInput,
} from "@/lib/website/marketing-cards-admin";
import { importHomepageQalamchiCards } from "@/lib/website/import-homepage-qalamchi-cards";

export type MarketingCardActionState = {
  formError?: string;
  successMessage?: string;
  fieldErrors?: Record<string, string>;
};

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function revalidateMarketingCards() {
  revalidatePath("/admin/website/marketing-cards");
  revalidatePath("/");
}

async function assertOrgMedia(
  organizationId: string,
  mediaId: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!mediaId) return { ok: true };
  const media = await prisma.mediaAsset.findFirst({
    where: { id: mediaId, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!media) {
    return { ok: false, error: "تصویر انتخاب‌شده در این سازمان یافت نشد." };
  }
  return { ok: true };
}

function parseWriteInput(
  formData: FormData,
):
  | { ok: true; data: MarketingCardWriteInput }
  | { ok: false; formError: string; fieldErrors?: Record<string, string> } {
  const title =
    normalizeMarketingCardText(
      readString(formData, "title"),
      MARKETING_CARD_TITLE_MAX,
    ) ?? "";
  const description =
    normalizeMarketingCardText(
      readString(formData, "description"),
      MARKETING_CARD_DESCRIPTION_MAX,
    ) ?? "";
  const badge = normalizeMarketingCardText(
    readString(formData, "badge"),
    MARKETING_CARD_BADGE_MAX,
  );
  const imageAlt = normalizeMarketingCardText(
    readString(formData, "imageAlt"),
    MARKETING_CARD_IMAGE_ALT_MAX,
  );
  const imageMediaId = readString(formData, "mediaId").trim() || null;
  const isActive = readString(formData, "isActive") === "true";

  if (title.length < 1) {
    return {
      ok: false,
      formError: "عنوان الزامی است.",
      fieldErrors: { title: "عنوان را وارد کنید." },
    };
  }

  return {
    ok: true,
    data: {
      title,
      description,
      badge,
      imageMediaId,
      imageAlt,
      isActive,
    },
  };
}

export async function createMarketingCardAction(
  formData: FormData,
): Promise<void> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;

  const sectionKeyRaw =
    readString(formData, "sectionKey").trim() || HOMEPAGE_QALAMCHI_SECTION_KEY;
  if (!isMarketingCardSectionKey(sectionKeyRaw)) {
    return;
  }

  const parsed = parseWriteInput(formData);
  if (!parsed.ok) {
    return;
  }

  const mediaCheck = await assertOrgMedia(
    organizationId,
    parsed.data.imageMediaId,
  );
  if (!mediaCheck.ok) {
    return;
  }

  const sortOrder = await nextMarketingCardSortOrder(
    organizationId,
    sectionKeyRaw,
  );

  const card = await prisma.websiteMarketingCard.create({
    data: buildMarketingCardCreateData(
      organizationId,
      sectionKeyRaw,
      sortOrder,
      parsed.data,
    ),
    select: { id: true },
  });

  revalidateMarketingCards();
  redirect(`/admin/website/marketing-cards/${card.id}`);
}

export async function updateMarketingCardAction(
  _prev: MarketingCardActionState,
  formData: FormData,
): Promise<MarketingCardActionState> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const cardId = readString(formData, "cardId").trim();

  const existing = await prisma.websiteMarketingCard.findFirst({
    where: { id: cardId, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) {
    return { formError: "کارت یافت نشد." };
  }

  const parsed = parseWriteInput(formData);
  if (!parsed.ok) {
    return {
      formError: parsed.formError,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const mediaCheck = await assertOrgMedia(
    organizationId,
    parsed.data.imageMediaId,
  );
  if (!mediaCheck.ok) {
    return { formError: mediaCheck.error };
  }

  await prisma.websiteMarketingCard.update({
    where: { id: cardId },
    data: buildMarketingCardUpdateData(parsed.data),
  });

  revalidateMarketingCards();
  return { successMessage: "کارت ذخیره شد." };
}

export async function deleteMarketingCardAction(
  formData: FormData,
): Promise<void> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const cardId = readString(formData, "cardId").trim();

  const existing = await prisma.websiteMarketingCard.findFirst({
    where: { id: cardId, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) return;

  await prisma.websiteMarketingCard.update({
    where: { id: cardId },
    data: { deletedAt: new Date(), isActive: false },
  });
  revalidateMarketingCards();
}

export async function toggleMarketingCardActiveAction(
  formData: FormData,
): Promise<void> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const cardId = readString(formData, "cardId").trim();
  const nextActive = readString(formData, "isActive") === "true";

  const existing = await prisma.websiteMarketingCard.findFirst({
    where: { id: cardId, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) return;

  await prisma.websiteMarketingCard.update({
    where: { id: cardId },
    data: { isActive: nextActive },
  });
  revalidateMarketingCards();
}

export async function moveMarketingCardAction(
  formData: FormData,
): Promise<void> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const cardId = readString(formData, "cardId").trim();
  const direction = readString(formData, "direction").trim();
  const sectionKey =
    readString(formData, "sectionKey").trim() || HOMEPAGE_QALAMCHI_SECTION_KEY;

  if (!isMarketingCardSectionKey(sectionKey)) return;
  if (direction !== "up" && direction !== "down") return;

  const rows = await prisma.websiteMarketingCard.findMany({
    where: { organizationId, sectionKey, deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, sortOrder: true },
  });

  const index = rows.findIndex((row) => row.id === cardId);
  if (index < 0) return;

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= rows.length) return;

  const current = rows[index];
  const neighbor = rows[swapIndex];

  await prisma.$transaction([
    prisma.websiteMarketingCard.update({
      where: { id: current.id },
      data: { sortOrder: neighbor.sortOrder },
    }),
    prisma.websiteMarketingCard.update({
      where: { id: neighbor.id },
      data: { sortOrder: current.sortOrder },
    }),
  ]);

  // Normalize dense order after swap (stable contiguous sequence).
  const refreshed = await prisma.websiteMarketingCard.findMany({
    where: { organizationId, sectionKey, deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  await prisma.$transaction(
    refreshed.map((row, order) =>
      prisma.websiteMarketingCard.update({
        where: { id: row.id },
        data: { sortOrder: order },
      }),
    ),
  );

  revalidateMarketingCards();
}

export async function reorderMarketingCardsAction(
  _prev: MarketingCardActionState,
  formData: FormData,
): Promise<MarketingCardActionState> {
  const session = await requirePermission("website.manage");
  const organizationId = session.organization.id;
  const sectionKey =
    readString(formData, "sectionKey").trim() || HOMEPAGE_QALAMCHI_SECTION_KEY;
  const orderedIds = formData
    .getAll("cardIds")
    .filter((value): value is string => typeof value === "string" && value.length > 0);

  if (!isMarketingCardSectionKey(sectionKey) || orderedIds.length === 0) {
    return { formError: "ترتیب نامعتبر است." };
  }

  const rows = await prisma.websiteMarketingCard.findMany({
    where: { organizationId, sectionKey, deletedAt: null },
    select: { id: true },
  });
  const idSet = new Set(rows.map((row) => row.id));

  if (
    orderedIds.length !== rows.length ||
    orderedIds.some((id) => !idSet.has(id))
  ) {
    return {
      formError:
        "ترتیب نامعتبر است؛ همه کارت‌ها باید متعلق به همین سازمان و بخش باشند.",
    };
  }

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.websiteMarketingCard.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  );

  revalidateMarketingCards();
  return { successMessage: "ترتیب کارت‌ها ذخیره شد." };
}

/** One-time import of the two static homepage Qalamchi cards into CMS. */
export async function importHomepageQalamchiCardsAction(): Promise<void> {
  const session = await requirePermission("website.manage");
  const result = await importHomepageQalamchiCards(session.organization.id);

  if (!result.ok) {
    redirect("/admin/website/marketing-cards?import=error");
  }

  if (result.status === "created") {
    revalidateMarketingCards();
    redirect("/admin/website/marketing-cards?import=ok");
  }

  redirect("/admin/website/marketing-cards?import=already");
}
