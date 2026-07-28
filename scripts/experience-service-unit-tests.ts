/**
 * Checkpoint 3 — Experience service pure unit tests (no database).
 * Covers owner purpose gates, publish validation, media role checks,
 * structured errors, and typed config duplication helpers.
 *
 * Run: npm run test:experience-service
 */

import assert from "node:assert/strict";
import { ExperienceBlockStatus } from "../generated/prisma/enums";
import { getDefaultBlockConfig } from "../lib/experience/registry";
import { getBlockDefinition } from "../lib/experience/registry";
import { REGISTRATION_FORM_BLOCK_TYPE } from "../lib/experience/blocks/registration-form";
import { assertSupportedOwnerPurpose } from "../lib/experience/service/owner";
import { validateMediaRolesForBlockType } from "../lib/experience/service/media-sync";
import {
  validateExperienceVersionForPublish,
  type PublishBlockInput,
} from "../lib/experience/service/validate-publish";

let passed = 0;

function test(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`✓ ${name}`);
}

function block(
  partial: Partial<PublishBlockInput> &
    Pick<PublishBlockInput, "id" | "type" | "sortOrder">,
): PublishBlockInput {
  const type = partial.type;
  const def = getBlockDefinition(type);
  const config =
    partial.config ??
    (def ? getDefaultBlockConfig(type as never) : { v: 1 });
  return {
    id: partial.id,
    type,
    status: partial.status ?? ExperienceBlockStatus.PUBLISHED,
    sortOrder: partial.sortOrder,
    config,
    mediaLinks: partial.mediaLinks ?? [],
  };
}

function landingBlocks(extra: PublishBlockInput[] = []): PublishBlockInput[] {
  return [
    block({ id: "b1", type: "HERO", sortOrder: 0 }),
    block({ id: "b2", type: REGISTRATION_FORM_BLOCK_TYPE, sortOrder: 1 }),
    ...extra.map((item, index) => ({
      ...item,
      sortOrder: 2 + index,
    })),
  ];
}

test("rejects unsupported owner types", () => {
  const result = assertSupportedOwnerPurpose({
    ownerType: "WEBSITE_PAGE",
    purpose: "LANDING",
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "UNSUPPORTED_OWNER");
});

test("rejects unsupported purposes", () => {
  const result = assertSupportedOwnerPurpose({
    ownerType: "REGISTRATION_FLOW",
    purpose: "SUCCESS",
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "UNSUPPORTED_PURPOSE");
});

test("accepts REGISTRATION_FLOW + LANDING", () => {
  const result = assertSupportedOwnerPurpose({
    ownerType: "REGISTRATION_FLOW",
    purpose: "LANDING",
  });
  assert.equal(result.ok, true);
});

test("valid LANDING publish passes", () => {
  const result = validateExperienceVersionForPublish({
    versionId: "v1",
    experienceId: "e1",
    organizationId: "o1",
    purpose: "LANDING",
    ownerExists: true,
    blocks: landingBlocks(),
  });
  assert.equal(result.ok, true);
});

test("owner missing yields structured OWNER_NOT_FOUND", () => {
  const result = validateExperienceVersionForPublish({
    versionId: "v1",
    experienceId: "e1",
    organizationId: "o1",
    purpose: "LANDING",
    ownerExists: false,
    blocks: landingBlocks(),
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.issues.some((i) => i.code === "OWNER_NOT_FOUND"));
  }
});

test("empty enabled blocks rejected", () => {
  const result = validateExperienceVersionForPublish({
    versionId: "v1",
    experienceId: "e1",
    organizationId: "o1",
    purpose: "LANDING",
    ownerExists: true,
    blocks: [
      block({
        id: "b1",
        type: REGISTRATION_FORM_BLOCK_TYPE,
        sortOrder: 0,
        status: ExperienceBlockStatus.DISABLED,
      }),
    ],
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.issues.some((i) => i.path === "blocks"));
  }
});

test("exactly-one REGISTRATION_FORM rule — zero fails", () => {
  const result = validateExperienceVersionForPublish({
    versionId: "v1",
    experienceId: "e1",
    organizationId: "o1",
    purpose: "LANDING",
    ownerExists: true,
    blocks: [block({ id: "b1", type: "HERO", sortOrder: 0 })],
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(
      result.issues.some((i) => i.path === "blocks.REGISTRATION_FORM"),
    );
  }
});

test("exactly-one REGISTRATION_FORM rule — two fails", () => {
  const result = validateExperienceVersionForPublish({
    versionId: "v1",
    experienceId: "e1",
    organizationId: "o1",
    purpose: "LANDING",
    ownerExists: true,
    blocks: [
      block({ id: "b1", type: REGISTRATION_FORM_BLOCK_TYPE, sortOrder: 0 }),
      block({ id: "b2", type: REGISTRATION_FORM_BLOCK_TYPE, sortOrder: 1 }),
    ],
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    const issue = result.issues.find(
      (i) => i.path === "blocks.REGISTRATION_FORM",
    );
    assert.ok(issue);
    assert.equal(issue?.details?.count, 2);
  }
});

test("unknown block type rejected with structured issue", () => {
  const result = validateExperienceVersionForPublish({
    versionId: "v1",
    experienceId: "e1",
    organizationId: "o1",
    purpose: "LANDING",
    ownerExists: true,
    blocks: [
      {
        id: "b1",
        type: "NOT_A_REAL_BLOCK",
        status: ExperienceBlockStatus.PUBLISHED,
        sortOrder: 0,
        config: { v: 1 },
        mediaLinks: [],
      },
      block({ id: "b2", type: REGISTRATION_FORM_BLOCK_TYPE, sortOrder: 1 }),
    ],
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.issues.some((i) => i.code === "BLOCK_TYPE_UNKNOWN"));
  }
});

test("invalid config rejected with BLOCK_CONFIG_INVALID", () => {
  const result = validateExperienceVersionForPublish({
    versionId: "v1",
    experienceId: "e1",
    organizationId: "o1",
    purpose: "LANDING",
    ownerExists: true,
    blocks: [
      {
        id: "b1",
        type: "HERO",
        status: ExperienceBlockStatus.PUBLISHED,
        sortOrder: 0,
        config: { v: 1, align: "start", overlay: "soft" }, // missing headline
        mediaLinks: [],
      },
      block({ id: "b2", type: REGISTRATION_FORM_BLOCK_TYPE, sortOrder: 1 }),
    ],
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.issues.some((i) => i.code === "BLOCK_CONFIG_INVALID"));
  }
});

test("forbidden pricing amount key fails via parseConfig", () => {
  const result = validateExperienceVersionForPublish({
    versionId: "v1",
    experienceId: "e1",
    organizationId: "o1",
    purpose: "LANDING",
    ownerExists: true,
    blocks: [
      block({ id: "b1", type: REGISTRATION_FORM_BLOCK_TYPE, sortOrder: 0 }),
      {
        id: "b2",
        type: "PRICING",
        status: ExperienceBlockStatus.PUBLISHED,
        sortOrder: 1,
        config: {
          v: 1,
          variant: "card",
          paymentAmountRials: 1000,
        },
        mediaLinks: [],
      },
    ],
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.issues.some((i) => i.code === "BLOCK_CONFIG_INVALID"));
  }
});

test("non-contiguous sortOrder rejected", () => {
  const result = validateExperienceVersionForPublish({
    versionId: "v1",
    experienceId: "e1",
    organizationId: "o1",
    purpose: "LANDING",
    ownerExists: true,
    blocks: [
      block({ id: "b1", type: "HERO", sortOrder: 0 }),
      block({ id: "b2", type: REGISTRATION_FORM_BLOCK_TYPE, sortOrder: 3 }),
    ],
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(
      result.issues.some((i) => i.path === "blocks.sortOrder"),
    );
  }
});

test("invalid media role rejected", () => {
  const result = validateExperienceVersionForPublish({
    versionId: "v1",
    experienceId: "e1",
    organizationId: "o1",
    purpose: "LANDING",
    ownerExists: true,
    blocks: [
      {
        id: "b1",
        type: "HERO",
        status: ExperienceBlockStatus.PUBLISHED,
        sortOrder: 0,
        config: getDefaultBlockConfig("HERO"),
        mediaLinks: [
          { role: "background", mediaId: "m1", sortOrder: 0 },
        ],
      },
      block({ id: "b2", type: REGISTRATION_FORM_BLOCK_TYPE, sortOrder: 1 }),
    ],
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.issues.some((i) => i.code === "MEDIA_INVALID"));
  }
});

test("validateMediaRolesForBlockType allows HERO primary", () => {
  const ok = validateMediaRolesForBlockType("HERO", ["primary"]);
  assert.equal(ok.ok, true);
});

test("validateMediaRolesForBlockType rejects SPACER primary", () => {
  const bad = validateMediaRolesForBlockType("SPACER", ["primary"]);
  assert.equal(bad.ok, false);
});

test("HERO duplicateConfig deep-copies nested buttons", () => {
  const def = getBlockDefinition("HERO");
  assert.ok(def);
  const parsed = def.parseConfig({
    v: 1,
    headline: "H",
    align: "start",
    overlay: "soft",
    primaryCta: { label: "A", href: "/a" },
  });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) {
    assert.fail("expected HERO parseConfig to succeed");
  }
  const original = parsed.data;
  const copy = def.duplicateConfig(original);
  assert.ok(copy.primaryCta);
  assert.notEqual(copy.primaryCta, original.primaryCta);
  copy.primaryCta!.label = "X";
  assert.equal(original.primaryCta?.label, "A");
});

test("issues are structured objects not only strings", () => {
  const result = validateExperienceVersionForPublish({
    versionId: "v1",
    experienceId: "e1",
    organizationId: "o1",
    purpose: "LANDING",
    ownerExists: true,
    blocks: [],
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(Array.isArray(result.issues));
    assert.ok(result.issues.length > 0);
    assert.equal(typeof result.issues[0].code, "string");
    assert.equal(typeof result.issues[0].message, "string");
  }
});

console.log(`\n${passed} experience service unit tests passed.`);
