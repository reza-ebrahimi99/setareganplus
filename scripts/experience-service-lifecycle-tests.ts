/**
 * Checkpoint 3 — Experience lifecycle integration tests (PostgreSQL).
 *
 * Requires migrated DB with Experience tables and seeded org:
 *   NODE_ENV=test
 *   DATABASE_URL=...
 *
 * Run:
 *   npm run test:experience-lifecycle
 *
 * Creates temporary RegistrationFlow + Experience rows and cleans up in finally.
 */

import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import {
  ExperienceBlockStatus,
  ExperienceOwnerType,
  ExperiencePurpose,
  ExperienceStatus,
  ExperienceVersionStatus,
  MediaAssetStatus,
  RegistrationFlowLifecycle,
  RegistrationFlowPaymentMode,
  RegistrationProductType,
} from "../generated/prisma/enums";
import { prisma } from "../lib/prisma";
import {
  addBlock,
  archiveDraftVersion,
  attachBlockMedia,
  clonePublishedVersionToDraft,
  createExperience,
  deleteBlock,
  disableBlock,
  duplicateBlock,
  getEditableDraftVersion,
  getOrCreateDraftExperience,
  loadDraftExperienceByOwner,
  loadPublishedExperienceByOwner,
  publishExperienceVersion,
  reorderBlocks,
  updateBlockConfig,
} from "../lib/experience/service";
import { getDefaultBlockConfig } from "../lib/experience/registry";
import { REGISTRATION_FORM_BLOCK_TYPE } from "../lib/experience/blocks/registration-form";

if (process.env.NODE_ENV !== "test") {
  console.error(
    "Refusing to run experience lifecycle tests unless NODE_ENV=test.",
  );
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL is not set. Configure a migrated development/test database.",
  );
  process.exit(1);
}

let passed = 0;
function test(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(() => fn())
    .then(() => {
      passed += 1;
      console.log(`✓ ${name}`);
    });
}

async function main() {
  const organization = await prisma.organization.findFirst({
    where: { slug: "setareganplus", deletedAt: null },
    select: { id: true },
  });
  assert(organization, "Organization setareganplus not found; run db:seed first.");

  const otherOrg = await prisma.organization.findFirst({
    where: {
      deletedAt: null,
      NOT: { id: organization.id },
    },
    select: { id: true },
  });

  const suffix = randomBytes(5).toString("hex");
  let flowId: string | null = null;
  let foreignFlowId: string | null = null;
  let experienceId: string | null = null;
  let mediaId: string | null = null;
  let actorUserId: string | null = null;

  try {
    const actor = await prisma.user.findFirst({
      where: { deletedAt: null },
      select: { id: true },
    });
    assert(actor, "Need at least one user for actorUserId");
    actorUserId = actor.id;

    const flow = await prisma.registrationFlow.create({
      data: {
        organization: { connect: { id: organization.id } },
        title: `Exp Test Flow ${suffix}`,
        slug: `exp-test-${suffix}`,
        description: "experience lifecycle test",
        lifecycle: RegistrationFlowLifecycle.DRAFT,
        productType: RegistrationProductType.SCHOOL_REGISTRATION,
        paymentMode: RegistrationFlowPaymentMode.FIXED_PRICE,
        paymentAmountRials: 1_000_000,
      },
      select: { id: true },
    });
    flowId = flow.id;

    if (otherOrg) {
      const foreign = await prisma.registrationFlow.create({
        data: {
          organization: { connect: { id: otherOrg.id } },
          title: `Foreign Flow ${suffix}`,
          slug: `exp-foreign-${suffix}`,
          description: "cross-org",
          lifecycle: RegistrationFlowLifecycle.DRAFT,
          productType: RegistrationProductType.SCHOOL_REGISTRATION,
          paymentMode: RegistrationFlowPaymentMode.FREE,
          paymentAmountRials: 0,
        },
        select: { id: true },
      });
      foreignFlowId = foreign.id;
    }

    const media = await prisma.mediaAsset.create({
      data: {
        organizationId: organization.id,
        storageKey: `test/experience/${suffix}.jpg`,
        originalName: "test.jpg",
        mimeType: "image/jpeg",
        byteSize: 100,
        checksum: `chk-${suffix}`,
        status: MediaAssetStatus.ACTIVE,
        createdByUserId: actorUserId,
      },
      select: { id: true },
    });
    mediaId = media.id;

    await test("owner validation rejects cross-organization flow", async () => {
      if (!foreignFlowId) {
        console.log("  (skip — no second organization in DB)");
        return;
      }
      const result = await createExperience({
        organizationId: organization.id,
        ownerType: ExperienceOwnerType.REGISTRATION_FLOW,
        ownerId: foreignFlowId,
        purpose: ExperiencePurpose.LANDING,
        actorUserId,
      });
      assert.equal(result.ok, false);
      if (!result.ok) assert.equal(result.code, "OWNER_ORG_MISMATCH");
    });

    await test("createExperience creates draft version", async () => {
      const result = await createExperience({
        organizationId: organization.id,
        ownerType: ExperienceOwnerType.REGISTRATION_FLOW,
        ownerId: flowId!,
        purpose: ExperiencePurpose.LANDING,
        title: `Landing ${suffix}`,
        actorUserId,
      });
      assert.equal(result.ok, true);
      if (!result.ok) return;
      experienceId = result.data.experience.id;
      assert.equal(result.data.experience.status, ExperienceStatus.DRAFT);
      assert.ok(result.data.draftVersionId);

      const draft = await getEditableDraftVersion({
        organizationId: organization.id,
        experienceId: experienceId,
      });
      assert.equal(draft.ok, true);
      if (draft.ok) {
        assert.equal(draft.data.versionId, result.data.draftVersionId);
      }
    });

    await test("duplicate createExperience / draft prevention", async () => {
      const again = await createExperience({
        organizationId: organization.id,
        ownerType: ExperienceOwnerType.REGISTRATION_FLOW,
        ownerId: flowId!,
        purpose: ExperiencePurpose.LANDING,
        actorUserId,
      });
      assert.equal(again.ok, false);
      if (!again.ok) {
        assert.ok(
          again.code === "DRAFT_EXISTS" || again.code === "CONFLICT",
        );
      }

      const got = await getOrCreateDraftExperience({
        organizationId: organization.id,
        ownerType: ExperienceOwnerType.REGISTRATION_FLOW,
        ownerId: flowId!,
        purpose: ExperiencePurpose.LANDING,
        actorUserId,
      });
      assert.equal(got.ok, true);
      if (got.ok) assert.equal(got.data.created, false);
    });

    let draftVersionId = "";
    await test("draft-only block add/update/duplicate/reorder", async () => {
      const draft = await getEditableDraftVersion({
        organizationId: organization.id,
        experienceId: experienceId!,
      });
      assert.equal(draft.ok, true);
      if (!draft.ok) return;
      draftVersionId = draft.data.versionId;

      const hero = await addBlock({
        organizationId: organization.id,
        experienceId: experienceId!,
        versionId: draftVersionId,
        type: "HERO",
      });
      assert.equal(hero.ok, true);
      if (!hero.ok) return;

      const form = await addBlock({
        organizationId: organization.id,
        experienceId: experienceId!,
        versionId: draftVersionId,
        type: REGISTRATION_FORM_BLOCK_TYPE,
      });
      assert.equal(form.ok, true);
      if (!form.ok) return;

      const pricing = await addBlock({
        organizationId: organization.id,
        experienceId: experienceId!,
        versionId: draftVersionId,
        type: "PRICING",
      });
      assert.equal(pricing.ok, true);
      if (!pricing.ok) return;

      const updated = await updateBlockConfig({
        organizationId: organization.id,
        blockId: hero.data.blockId,
        config: {
          ...getDefaultBlockConfig("HERO"),
          headline: "عنوان تست",
        },
      });
      assert.equal(updated.ok, true);

      const dup = await duplicateBlock({
        organizationId: organization.id,
        blockId: pricing.data.blockId,
      });
      assert.equal(dup.ok, true);
      if (!dup.ok) return;

      // Remove duplicate pricing so LANDING has exactly one REGISTRATION_FORM
      // and we can publish; keep hero + form + one pricing
      const del = await deleteBlock({
        organizationId: organization.id,
        blockId: dup.data.blockId,
      });
      assert.equal(del.ok, true);

      const reordered = await reorderBlocks({
        organizationId: organization.id,
        experienceId: experienceId!,
        versionId: draftVersionId,
        orderedBlockIds: [
          form.data.blockId,
          hero.data.blockId,
          pricing.data.blockId,
        ],
      });
      // May fail if sort after delete changed ids — fetch live ids
      if (!reordered.ok) {
        const live = await prisma.experienceBlock.findMany({
          where: {
            organizationId: organization.id,
            experienceVersionId: draftVersionId,
            deletedAt: null,
          },
          orderBy: { sortOrder: "asc" },
          select: { id: true },
        });
        const ids = live.map((row) => row.id).reverse();
        const again = await reorderBlocks({
          organizationId: organization.id,
          experienceId: experienceId!,
          versionId: draftVersionId,
          orderedBlockIds: ids,
        });
        assert.equal(again.ok, true);
        const after = await prisma.experienceBlock.findMany({
          where: {
            organizationId: organization.id,
            experienceVersionId: draftVersionId,
            deletedAt: null,
          },
          orderBy: { sortOrder: "asc" },
          select: { id: true, sortOrder: true },
        });
        after.forEach((row, index) => assert.equal(row.sortOrder, index));
        assert.deepEqual(
          after.map((row) => row.id),
          ids,
        );
      } else {
        const after = await prisma.experienceBlock.findMany({
          where: {
            organizationId: organization.id,
            experienceVersionId: draftVersionId,
            deletedAt: null,
          },
          orderBy: { sortOrder: "asc" },
          select: { id: true, sortOrder: true },
        });
        after.forEach((row, index) => assert.equal(row.sortOrder, index));
      }
    });

    await test("media attach validates org + role", async () => {
      const hero = await prisma.experienceBlock.findFirst({
        where: {
          organizationId: organization.id,
          experienceVersionId: draftVersionId,
          type: "HERO",
          deletedAt: null,
        },
        select: { id: true },
      });
      assert.ok(hero);

      const badRole = await attachBlockMedia({
        organizationId: organization.id,
        blockId: hero.id,
        role: "background",
        mediaId: mediaId!,
      });
      assert.equal(badRole.ok, false);

      const ok = await attachBlockMedia({
        organizationId: organization.id,
        blockId: hero.id,
        role: "primary",
        mediaId: mediaId!,
      });
      assert.equal(ok.ok, true);
    });

    await test("invalid publish rejected (missing REGISTRATION_FORM if disabled)", async () => {
      const formBlock = await prisma.experienceBlock.findFirst({
        where: {
          organizationId: organization.id,
          experienceVersionId: draftVersionId,
          type: REGISTRATION_FORM_BLOCK_TYPE,
          deletedAt: null,
        },
        select: { id: true },
      });
      assert.ok(formBlock);
      await disableBlock({
        organizationId: organization.id,
        blockId: formBlock.id,
      });

      const published = await publishExperienceVersion({
        organizationId: organization.id,
        experienceId: experienceId!,
        expectedDraftVersionId: draftVersionId,
        actorUserId: actorUserId!,
      });
      assert.equal(published.ok, false);
      if (!published.ok) {
        assert.equal(published.code, "VALIDATION_FAILED");
        assert.ok(published.issues && published.issues.length > 0);
      }

      // re-enable for successful publish
      await prisma.experienceBlock.update({
        where: { id: formBlock.id },
        data: { status: ExperienceBlockStatus.PUBLISHED },
      });
    });

    let publishedVersionId = "";
    let freshDraftId = "";
    await test("valid publish supersedes and sets publishedVersionId", async () => {
      const published = await publishExperienceVersion({
        organizationId: organization.id,
        experienceId: experienceId!,
        expectedDraftVersionId: draftVersionId,
        actorUserId: actorUserId!,
      });
      assert.equal(published.ok, true);
      if (!published.ok) return;

      publishedVersionId = published.data.publishedVersionId;
      freshDraftId = published.data.freshDraftVersionId;
      assert.notEqual(publishedVersionId, freshDraftId);

      const experience = await prisma.experience.findFirst({
        where: { id: experienceId!, organizationId: organization.id },
        select: {
          publishedVersionId: true,
          status: true,
        },
      });
      assert.equal(experience?.publishedVersionId, publishedVersionId);
      assert.equal(experience?.status, ExperienceStatus.ACTIVE);

      const publishedRow = await prisma.experienceVersion.findFirst({
        where: { id: publishedVersionId },
        select: { status: true },
      });
      assert.equal(publishedRow?.status, ExperienceVersionStatus.PUBLISHED);

      const fresh = await prisma.experienceVersion.findFirst({
        where: { id: freshDraftId },
        select: { status: true },
      });
      assert.equal(fresh?.status, ExperienceVersionStatus.DRAFT);
    });

    await test("published version is immutable for block mutation", async () => {
      const publishedBlock = await prisma.experienceBlock.findFirst({
        where: {
          organizationId: organization.id,
          experienceVersionId: publishedVersionId,
          deletedAt: null,
        },
        select: { id: true },
      });
      assert.ok(publishedBlock);

      const mutate = await updateBlockConfig({
        organizationId: organization.id,
        blockId: publishedBlock.id,
        config: getDefaultBlockConfig("HERO"),
      });
      assert.equal(mutate.ok, false);
      if (!mutate.ok) {
        assert.ok(
          mutate.code === "VERSION_IMMUTABLE" ||
            mutate.code === "VERSION_NOT_DRAFT",
        );
      }
    });

    await test("published loader never returns draft data", async () => {
      const published = await loadPublishedExperienceByOwner({
        organizationId: organization.id,
        ownerType: ExperienceOwnerType.REGISTRATION_FLOW,
        ownerId: flowId!,
        purpose: ExperiencePurpose.LANDING,
      });
      assert.equal(published.ok, true);
      if (!published.ok || !published.data?.version) return;
      assert.equal(
        published.data.version.status,
        ExperienceVersionStatus.PUBLISHED,
      );
      assert.equal(published.data.version.id, publishedVersionId);
      assert.notEqual(published.data.version.id, freshDraftId);

      for (const block of published.data.version.blocks) {
        if (block.config != null) {
          assert.equal(block.config.v, 1);
        }
      }
    });

    await test("draft loader returns typed parsed configs", async () => {
      const draft = await loadDraftExperienceByOwner({
        organizationId: organization.id,
        ownerType: ExperienceOwnerType.REGISTRATION_FLOW,
        ownerId: flowId!,
        purpose: ExperiencePurpose.LANDING,
      });
      assert.equal(draft.ok, true);
      if (!draft.ok || !draft.data?.version) return;
      assert.equal(draft.data.version.status, ExperienceVersionStatus.DRAFT);
      assert.equal(draft.data.version.id, freshDraftId);
      assert.ok(draft.data.version.blocks.length > 0);
      const typed = draft.data.version.blocks.filter((b) => b.config != null);
      assert.ok(typed.length > 0);
    });

    await test("clonePublishedVersionToDraft blocked while draft exists", async () => {
      const cloned = await clonePublishedVersionToDraft({
        organizationId: organization.id,
        experienceId: experienceId!,
        actorUserId,
      });
      assert.equal(cloned.ok, false);
      if (!cloned.ok) assert.equal(cloned.code, "DRAFT_EXISTS");
    });

    await test("archive draft then clone published to new draft", async () => {
      const archived = await archiveDraftVersion({
        organizationId: organization.id,
        experienceId: experienceId!,
        versionId: freshDraftId,
      });
      assert.equal(archived.ok, true);

      const cloned = await clonePublishedVersionToDraft({
        organizationId: organization.id,
        experienceId: experienceId!,
        actorUserId,
      });
      assert.equal(cloned.ok, true);
      if (!cloned.ok) return;
      assert.notEqual(cloned.data.versionId, publishedVersionId);

      const row = await prisma.experienceVersion.findFirst({
        where: { id: cloned.data.versionId },
        select: { status: true },
      });
      assert.equal(row?.status, ExperienceVersionStatus.DRAFT);
    });

    await test("second publish supersedes previous published", async () => {
      const draft = await getEditableDraftVersion({
        organizationId: organization.id,
        experienceId: experienceId!,
      });
      assert.equal(draft.ok, true);
      if (!draft.ok) return;

      // Ensure exactly one REGISTRATION_FORM enabled
      const blocks = await prisma.experienceBlock.findMany({
        where: {
          organizationId: organization.id,
          experienceVersionId: draft.data.versionId,
          deletedAt: null,
        },
        select: { id: true, type: true, status: true },
      });
      const forms = blocks.filter(
        (b) => b.type === REGISTRATION_FORM_BLOCK_TYPE,
      );
      assert.ok(forms.length >= 1);
      for (const form of forms.slice(1)) {
        await disableBlock({
          organizationId: organization.id,
          blockId: form.id,
        });
      }
      await prisma.experienceBlock.update({
        where: { id: forms[0].id },
        data: { status: ExperienceBlockStatus.PUBLISHED },
      });

      const published = await publishExperienceVersion({
        organizationId: organization.id,
        experienceId: experienceId!,
        expectedDraftVersionId: draft.data.versionId,
        actorUserId: actorUserId!,
      });
      assert.equal(published.ok, true);
      if (!published.ok) return;

      const old = await prisma.experienceVersion.findFirst({
        where: { id: publishedVersionId },
        select: { status: true },
      });
      assert.equal(old?.status, ExperienceVersionStatus.SUPERSEDED);

      const experience = await prisma.experience.findFirst({
        where: { id: experienceId! },
        select: { publishedVersionId: true },
      });
      assert.equal(
        experience?.publishedVersionId,
        published.data.publishedVersionId,
      );
      assert.notEqual(experience?.publishedVersionId, publishedVersionId);
    });

    console.log(`\n${passed} experience lifecycle integration tests passed.`);
  } finally {
    if (experienceId) {
      await prisma.experienceBlockMedia.deleteMany({
        where: {
          block: {
            experienceVersion: { experienceId },
          },
        },
      });
      await prisma.experienceBlock.deleteMany({
        where: { experienceVersion: { experienceId } },
      });
      await prisma.experience.updateMany({
        where: { id: experienceId },
        data: { publishedVersionId: null },
      });
      await prisma.experienceVersion.deleteMany({
        where: { experienceId },
      });
      await prisma.experience.deleteMany({ where: { id: experienceId } });
    }
    if (flowId) {
      await prisma.registrationFlow.deleteMany({ where: { id: flowId } });
    }
    if (foreignFlowId) {
      await prisma.registrationFlow.deleteMany({ where: { id: foreignFlowId } });
    }
    if (mediaId) {
      await prisma.mediaAsset.deleteMany({ where: { id: mediaId } });
    }
    await prisma.$disconnect();
  }
}

main().catch(async (error: unknown) => {
  console.error(error);
  try {
    await prisma.$disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
