/**
 * Checkpoint 4 — Experience public renderer pure unit tests (no database / network).
 *
 * Run: npm run test:experience-renderer
 */

import assert from "node:assert/strict";
import {
  ExperienceBlockStatus,
  ExperienceOwnerType,
  ExperiencePurpose,
  ExperienceStatus,
  ExperienceVersionStatus,
  RegistrationFlowPaymentMode,
  RegistrationProductType,
} from "../generated/prisma/enums";
import {
  getDefaultBlockConfig,
  isExperienceBlockType,
  loadPublicBlockRenderer,
} from "../lib/experience/registry";
import {
  isBlockPubliclyVisible,
  sortBlocksDeterministically,
} from "../lib/experience/public/block-visibility";
import {
  bindingFromPublicRenderContext,
  buildExperiencePublicRenderContext,
} from "../lib/experience/public/render-context";
import {
  experienceHasRenderableBlocks,
  selectRenderablePublicBlocks,
} from "../lib/experience/public/select-renderable-blocks";
import { resolveLandingSeoText } from "../lib/experience/public/seo";
import type {
  LoadedExperienceBlock,
  LoadedExperienceBundle,
} from "../lib/experience/service/loaders";
import type { PublicRegistrationFlow } from "../lib/registration/flows/public";
import type { ExperienceRecord } from "../lib/experience/service/experience-service";

let passed = 0;

function test(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`✓ ${name}`);
}

async function testAsync(name: string, fn: () => Promise<void>) {
  await fn();
  passed += 1;
  console.log(`✓ ${name}`);
}

function mockFlow(
  partial?: Partial<PublicRegistrationFlow>,
): PublicRegistrationFlow {
  return {
    id: "flow-1",
    organizationId: "org-1",
    title: "جریان تست",
    slug: "test-flow",
    description: "توضیح جریان",
    coverUrl: null,
    productType: RegistrationProductType.SCHOOL_REGISTRATION,
    academicYear: null,
    gradeTargets: null,
    courseTarget: null,
    capacity: 100,
    registrationCount: 40,
    paymentMode: RegistrationFlowPaymentMode.FIXED_PRICE,
    paymentAmountRials: 1_000_000,
    paymentTitle: null,
    paymentDeadlineAt: null,
    saleAmountRials: 800_000,
    pricingBadge: "تخفیف ویژه",
    discountStartsAt: new Date("2026-07-01T00:00:00.000Z"),
    discountEndsAt: new Date("2026-08-01T00:00:00.000Z"),
    showDiscountCountdown: true,
    opensAt: null,
    closesAt: new Date("2026-09-01T00:00:00.000Z"),
    formId: "form-1",
    formSlug: "form-slug",
    formTitle: "فرم",
    steps: [],
    documentRequirements: [],
    isOpen: true,
    closedReason: null,
    pricing: {
      amountRials: 1_000_000,
      finalAmountRials: 800_000,
      discountRials: 200_000,
      discountActive: true,
      pricingBadge: "تخفیف ویژه",
      discountEndsAtIso: "2026-08-01T00:00:00.000Z",
      showCountdown: true,
      discountPercent: 20,
    },
    ...partial,
  };
}

function mockBlock(
  partial: Partial<LoadedExperienceBlock> &
    Pick<LoadedExperienceBlock, "id" | "type" | "sortOrder">,
): LoadedExperienceBlock {
  const type = partial.type;
  const config =
    partial.config !== undefined
      ? partial.config
      : isExperienceBlockType(type)
        ? getDefaultBlockConfig(type)
        : null;
  return {
    id: partial.id,
    type,
    status: partial.status ?? ExperienceBlockStatus.PUBLISHED,
    sortOrder: partial.sortOrder,
    opensAt: partial.opensAt ?? null,
    closesAt: partial.closesAt ?? null,
    visibility: partial.visibility ?? null,
    animation: null,
    layout: null,
    rawConfig: partial.rawConfig ?? { poisoned: true, amountRials: 999 },
    mediaLinks: [],
    media: partial.media ?? {},
    config,
    diagnostics: partial.diagnostics ?? [],
  };
}

function mockBundle(blocks: LoadedExperienceBlock[]): LoadedExperienceBundle {
  const experience: ExperienceRecord = {
    id: "exp-1",
    organizationId: "org-1",
    ownerType: ExperienceOwnerType.REGISTRATION_FLOW,
    ownerId: "flow-1",
    purpose: ExperiencePurpose.LANDING,
    key: "default",
    title: "Landing",
    templateKey: null,
    status: ExperienceStatus.ACTIVE,
    publishedVersionId: "ver-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return {
    experience,
    version: {
      id: "ver-1",
      experienceId: "exp-1",
      versionNumber: 1,
      status: ExperienceVersionStatus.PUBLISHED,
      seoTitle: null,
      seoDescription: null,
      seoImageMediaId: null,
      themeOverride: {},
      publishedAt: new Date(),
      blocks,
      diagnostics: [],
    },
  };
}

async function main() {
  const now = new Date("2026-07-28T12:00:00.000Z");

  test("deterministic block ordering by sortOrder then id", () => {
    const blocks = [
      mockBlock({ id: "b", type: "SPACER", sortOrder: 1 }),
      mockBlock({ id: "a", type: "SPACER", sortOrder: 1 }),
      mockBlock({ id: "c", type: "HERO", sortOrder: 0 }),
    ];
    const ordered = sortBlocksDeterministically(blocks).map((b) => b.id);
    assert.deepEqual(ordered, ["c", "a", "b"]);
  });

  test("selectRenderable filters disabled blocks", () => {
    const result = selectRenderablePublicBlocks(
      [
        mockBlock({ id: "1", type: "HERO", sortOrder: 0 }),
        mockBlock({
          id: "2",
          type: "SPACER",
          sortOrder: 1,
          status: ExperienceBlockStatus.DISABLED,
        }),
      ],
      now,
    );
    assert.equal(result.blocks.length, 1);
    assert.equal(result.blocks[0].id, "1");
    assert.equal(result.skipped[0]?.reason, "DISABLED");
  });

  test("opensAt boundary: visible when now === opensAt (inclusive)", () => {
    const opensAt = new Date("2026-07-28T12:00:00.000Z");
    const gate = isBlockPubliclyVisible(
      mockBlock({ id: "1", type: "HERO", sortOrder: 0, opensAt }),
      opensAt,
    );
    assert.equal(gate.visible, true);
    assert.equal(gate.reason, "VISIBLE");
  });

  test("opensAt boundary: hidden when now is before opensAt", () => {
    const gate = isBlockPubliclyVisible(
      mockBlock({
        id: "1",
        type: "HERO",
        sortOrder: 0,
        opensAt: new Date("2026-07-28T12:00:01.000Z"),
      }),
      now,
    );
    assert.equal(gate.visible, false);
    assert.equal(gate.reason, "NOT_YET_ACTIVE");
  });

  test("closesAt boundary: visible when now === closesAt (inclusive)", () => {
    const closesAt = new Date("2026-07-28T12:00:00.000Z");
    const gate = isBlockPubliclyVisible(
      mockBlock({ id: "1", type: "HERO", sortOrder: 0, closesAt }),
      closesAt,
    );
    assert.equal(gate.visible, true);
  });

  test("closesAt boundary: hidden when now is after closesAt", () => {
    const gate = isBlockPubliclyVisible(
      mockBlock({
        id: "1",
        type: "HERO",
        sortOrder: 0,
        closesAt: new Date("2026-07-28T11:59:59.000Z"),
      }),
      now,
    );
    assert.equal(gate.visible, false);
    assert.equal(gate.reason, "EXPIRED");
  });

  test("invalid schedule opensAt > closesAt is filtered", () => {
    const gate = isBlockPubliclyVisible(
      mockBlock({
        id: "1",
        type: "HERO",
        sortOrder: 0,
        opensAt: new Date("2026-08-01T00:00:00.000Z"),
        closesAt: new Date("2026-07-01T00:00:00.000Z"),
      }),
      now,
    );
    assert.equal(gate.visible, false);
    assert.equal(gate.reason, "INVALID_SCHEDULE");
  });

  test("unknown block type is not renderable", () => {
    const result = selectRenderablePublicBlocks(
      [
        mockBlock({
          id: "1",
          type: "NOT_A_REAL_BLOCK",
          sortOrder: 0,
          config: null,
          diagnostics: [{ code: "BLOCK_TYPE_UNKNOWN", message: "unknown" }],
        }),
      ],
      now,
    );
    assert.equal(result.blocks.length, 0);
    assert.ok(
      result.skipped.some(
        (s) => s.reason === "UNKNOWN_TYPE" || s.reason === "INVALID_CONFIG",
      ),
    );
  });

  test("invalid config (null parsed config) is filtered", () => {
    const result = selectRenderablePublicBlocks(
      [
        mockBlock({
          id: "1",
          type: "HERO",
          sortOrder: 0,
          config: null,
          diagnostics: [{ code: "BLOCK_CONFIG_INVALID", message: "bad" }],
        }),
      ],
      now,
    );
    assert.equal(result.blocks.length, 0);
    assert.equal(result.skipped[0]?.reason, "INVALID_CONFIG");
  });

  test("rawConfig is never used as typed config source", () => {
    const block = mockBlock({
      id: "1",
      type: "HERO",
      sortOrder: 0,
      rawConfig: {
        v: 1,
        headline: "FROM_RAW",
        align: "start",
        overlay: "soft",
      },
    });
    assert.ok(block.config);
    assert.notEqual(
      (block.rawConfig as { headline?: string }).headline,
      (block.config as { headline?: string }).headline,
    );
    assert.equal(
      (block.config as { headline: string }).headline,
      getDefaultBlockConfig("HERO").headline,
    );
  });

  test("parsed config is required for visibility", () => {
    const withParsed = isBlockPubliclyVisible(
      mockBlock({ id: "1", type: "SPACER", sortOrder: 0 }),
      now,
    );
    const without = isBlockPubliclyVisible(
      mockBlock({ id: "2", type: "SPACER", sortOrder: 0, config: null }),
      now,
    );
    assert.equal(withParsed.visible, true);
    assert.equal(without.visible, false);
  });

  await testAsync("registry-only public renderer resolution", async () => {
    assert.equal(isExperienceBlockType("HERO"), true);
    const renderer = await loadPublicBlockRenderer("HERO");
    assert.equal(typeof renderer, "function");
  });

  test("registration form blocks are counted among renderable", () => {
    const result = selectRenderablePublicBlocks(
      [
        mockBlock({ id: "1", type: "HERO", sortOrder: 0 }),
        mockBlock({ id: "2", type: "REGISTRATION_FORM", sortOrder: 1 }),
        mockBlock({ id: "3", type: "REGISTRATION_FORM", sortOrder: 2 }),
      ],
      now,
    );
    assert.equal(result.registrationFormCount, 2);
    assert.equal(
      result.blocks.filter((b) => b.type === "REGISTRATION_FORM").length,
      2,
    );
  });

  test("pricing values come from context/domain not config", () => {
    const context = buildExperiencePublicRenderContext({
      flow: mockFlow(),
      now,
    });
    assert.equal(context.pricing.finalAmountRials, 800_000);
    assert.equal(context.pricing.amountRials, 1_000_000);
    assert.equal(context.promotion.active, true);
    assert.equal(context.promotion.kind, "TIMED_DISCOUNT");
    const pricingConfig = getDefaultBlockConfig("PRICING") as Record<
      string,
      unknown
    >;
    assert.equal("finalAmountRials" in pricingConfig, false);
    assert.equal("paymentAmountRials" in pricingConfig, false);
  });

  test("capacity values come from context", () => {
    const context = buildExperiencePublicRenderContext({
      flow: mockFlow({ capacity: 100, registrationCount: 40 }),
      now,
    });
    assert.equal(context.capacity.limit, 100);
    assert.equal(context.capacity.used, 40);
    assert.equal(context.capacity.remaining, 60);
    assert.equal(context.capacity.isUnlimited, false);
  });

  test("unlimited capacity handled safely", () => {
    const context = buildExperiencePublicRenderContext({
      flow: mockFlow({ capacity: null, registrationCount: 5 }),
      now,
    });
    assert.equal(context.capacity.isUnlimited, true);
    assert.equal(context.capacity.remaining, null);
  });

  test("countdown target comes from context deadlines", () => {
    const context = buildExperiencePublicRenderContext({
      flow: mockFlow(),
      now,
    });
    assert.equal(context.deadlines.countdownKind, "DISCOUNT");
    assert.equal(
      context.deadlines.countdownTargetIso,
      "2026-08-01T00:00:00.000Z",
    );
  });

  test("countdown falls back to registration close when no discount countdown", () => {
    const context = buildExperiencePublicRenderContext({
      flow: mockFlow({
        showDiscountCountdown: false,
        pricing: {
          amountRials: 1_000_000,
          finalAmountRials: 1_000_000,
          discountRials: 0,
          discountActive: false,
          pricingBadge: null,
          discountEndsAtIso: null,
          showCountdown: false,
          discountPercent: null,
        },
      }),
      now,
    });
    assert.equal(context.deadlines.countdownKind, "REGISTRATION_CLOSE");
    assert.ok(context.deadlines.countdownTargetIso?.startsWith("2026-09-01"));
  });

  test("binding slice preserves wizard attribution query", () => {
    const context = buildExperiencePublicRenderContext({
      flow: mockFlow(),
      wizardQuery: "utm_source=ig&preview=1",
      allowPreview: true,
      now,
    });
    const binding = bindingFromPublicRenderContext(context);
    assert.ok(binding.wizardPath.includes("utm_source=ig"));
    assert.equal(binding.canStartRegistration, true);
  });

  test("RTL and locale contracts on context", () => {
    const context = buildExperiencePublicRenderContext({
      flow: mockFlow(),
      now,
    });
    assert.equal(context.locale, "fa-IR");
    assert.equal(context.direction, "rtl");
  });

  test("published-only helper: empty version → no renderable", () => {
    const bundle = mockBundle([]);
    bundle.version = null;
    assert.equal(experienceHasRenderableBlocks(bundle, now), false);
  });

  test("fallback when no renderable blocks", () => {
    const bundle = mockBundle([
      mockBlock({
        id: "1",
        type: "HERO",
        sortOrder: 0,
        status: ExperienceBlockStatus.DISABLED,
      }),
    ]);
    assert.equal(experienceHasRenderableBlocks(bundle, now), false);
  });

  test("SEO Experience precedence over RegistrationFlow", () => {
    const resolved = resolveLandingSeoText({
      flowTitle: "جریان",
      flowDescription: "توضیح جریان",
      experienceSeoTitle: "عنوان تجربه",
      experienceSeoDescription: "توضیح تجربه",
    });
    assert.equal(resolved.title, "عنوان تجربه | ستارگان پلاس");
    assert.equal(resolved.description, "توضیح تجربه");
  });

  test("SEO RegistrationFlow fallback when Experience SEO empty", () => {
    const resolved = resolveLandingSeoText({
      flowTitle: "جریان",
      flowDescription: "توضیح جریان",
      experienceSeoTitle: "  ",
      experienceSeoDescription: null,
    });
    assert.equal(resolved.title, "جریان | ستارگان پلاس");
    assert.equal(resolved.description, "توضیح جریان");
  });

  test("draft block status never renders publicly", () => {
    const gate = isBlockPubliclyVisible(
      mockBlock({
        id: "1",
        type: "HERO",
        sortOrder: 0,
        status: ExperienceBlockStatus.DRAFT,
      }),
      now,
    );
    assert.equal(gate.visible, false);
    assert.equal(gate.reason, "DRAFT_STATUS");
  });

  test("optional block skip isolation does not remove other blocks", () => {
    const result = selectRenderablePublicBlocks(
      [
        mockBlock({
          id: "bad",
          type: "FEATURES",
          sortOrder: 0,
          config: null,
          diagnostics: [{ code: "BLOCK_CONFIG_INVALID", message: "x" }],
        }),
        mockBlock({ id: "ok", type: "SPACER", sortOrder: 1 }),
      ],
      now,
    );
    assert.equal(result.blocks.length, 1);
    assert.equal(result.blocks[0].id, "ok");
  });

  test("critical registration form missing formId yields null on context flow", () => {
    const context = buildExperiencePublicRenderContext({
      flow: mockFlow({ formId: null }),
      now,
    });
    assert.equal(context.registrationFlow.formId, null);
    assert.equal(context.availability.canStartRegistration, true);
  });

  console.log(`\n${passed} experience renderer unit tests passed.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
