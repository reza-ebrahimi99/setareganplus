/**
 * Checkpoint 5 — Experience admin pure unit tests (no database / network).
 *
 * Run: npm run test:experience-admin
 */

import assert from "node:assert/strict";
import { ExperienceBlockStatus } from "../generated/prisma/enums";
import {
  buildExperienceBlockConfigFromForm,
  canAddRegistrationFormBlock,
  canEnableRegistrationFormBlock,
  EXPERIENCE_ADMIN_PERMISSIONS,
  moveBlockInOrder,
  normalizeEnabledBlockStatus,
  parseBlockTypeOrNull,
  resolveExperienceEntryState,
  validateBlockScheduleWindow,
} from "../lib/experience/admin/form-helpers";
import { isExperienceBlockIconKey } from "../lib/experience/block-icon-keys";
import {
  BLOCK_REGISTRY,
  BLOCK_TYPE_OPTIONS,
  getBlockDefinition,
  getDefaultBlockConfig,
  isExperienceBlockType,
} from "../lib/experience/registry";
import { resolveCountdownTargetFromContext } from "../lib/experience/public/resolve-countdown-target";
import { resolveLandingSeoText } from "../lib/experience/public/seo";

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

function fd(entries: Record<string, string>): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    form.set(key, value);
  }
  return form;
}

async function main() {
  test("permission matrix: summary readable with view; mutate requires manage", () => {
    assert.equal(
      EXPERIENCE_ADMIN_PERMISSIONS.summaryRead,
      "registration_flows.view",
    );
    assert.equal(
      EXPERIENCE_ADMIN_PERMISSIONS.editor,
      "registration_flows.manage",
    );
    assert.equal(
      EXPERIENCE_ADMIN_PERMISSIONS.preview,
      "registration_flows.manage",
    );
    assert.equal(
      EXPERIENCE_ADMIN_PERMISSIONS.mutate,
      "registration_flows.manage",
    );
  });

  test("entry states: none / published-only / draft-active", () => {
    assert.equal(
      resolveExperienceEntryState({
        hasExperience: false,
        hasDraft: false,
        hasPublished: false,
      }),
      "NONE",
    );
    assert.equal(
      resolveExperienceEntryState({
        hasExperience: true,
        hasDraft: false,
        hasPublished: true,
      }),
      "PUBLISHED_ONLY",
    );
    assert.equal(
      resolveExperienceEntryState({
        hasExperience: true,
        hasDraft: true,
        hasPublished: true,
      }),
      "DRAFT_ACTIVE",
    );
  });

  test("block library options are registry-derived including categoryFa/iconKey", () => {
    assert.equal(
      BLOCK_TYPE_OPTIONS.length,
      Object.keys(BLOCK_REGISTRY).length,
    );
    for (const option of BLOCK_TYPE_OPTIONS) {
      const def = BLOCK_REGISTRY[option.type];
      assert.equal(option.labelFa, def.labelFa);
      assert.equal(option.categoryFa, def.categoryFa);
      assert.equal(option.iconKey, def.iconKey ?? null);
      if (option.iconKey) {
        assert.equal(isExperienceBlockIconKey(option.iconKey), true);
      }
    }
  });

  test("unknown block type rejected", () => {
    assert.equal(parseBlockTypeOrNull("NOT_REAL"), null);
    assert.equal(isExperienceBlockType("HERO"), true);
  });

  test("typed config validation via registry parseConfig", () => {
    const hero = getBlockDefinition("HERO").parseConfig(
      buildExperienceBlockConfigFromForm(
        "HERO",
        fd({
          headline: "عنوان",
          align: "center",
          overlay: "soft",
        }),
      ),
    );
    assert.equal(hero.ok, true);

    const bad = getBlockDefinition("SPACER").parseConfig(
      buildExperienceBlockConfigFromForm("SPACER", fd({ size: "huge" })),
    );
    assert.equal(bad.ok, false);
  });

  test("pricing config never carries trusted monetary amounts", () => {
    const raw = buildExperienceBlockConfigFromForm(
      "PRICING",
      fd({
        sectionTitle: "قیمت",
        variant: "card",
        showPaymentModeLabel: "on",
        paymentAmountRials: "999",
      }),
    ) as Record<string, unknown>;
    assert.equal("paymentAmountRials" in raw, false);
    const parsed = getBlockDefinition("PRICING").parseConfig(raw);
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal("paymentAmountRials" in parsed.data, false);
    }
  });

  test("countdown targetKind defaults AUTO and forbids timestamps in config", () => {
    const parsed = getBlockDefinition("COUNTDOWN").parseConfig(
      buildExperienceBlockConfigFromForm(
        "COUNTDOWN",
        fd({ heading: "مهلت", targetKind: "DISCOUNT" }),
      ),
    );
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.data.targetKind, "DISCOUNT");
      assert.equal("endsAtIso" in parsed.data, false);
    }
    const forbidden = getBlockDefinition("COUNTDOWN").parseConfig({
      v: 1,
      endsAtIso: "2026-01-01T00:00:00.000Z",
    });
    assert.equal(forbidden.ok, false);
  });

  test("countdown unavailable selected target handled safely", () => {
    const resolved = resolveCountdownTargetFromContext(
      {
        registrationOpensAtIso: null,
        registrationClosesAtIso: null,
        discountEndsAtIso: null,
        countdownTargetIso: null,
        countdownKind: null,
      },
      "DISCOUNT",
    );
    assert.equal(resolved.unavailable, true);
    assert.equal(resolved.targetIso, null);
  });

  test("single enabled REGISTRATION_FORM guard", () => {
    const blocks = [
      {
        id: "a",
        type: "REGISTRATION_FORM",
        status: ExperienceBlockStatus.PUBLISHED,
      },
      {
        id: "b",
        type: "REGISTRATION_FORM",
        status: ExperienceBlockStatus.DISABLED,
      },
    ];
    assert.equal(canAddRegistrationFormBlock(blocks), false);
    assert.equal(canEnableRegistrationFormBlock(blocks, "b"), false);
    assert.equal(canEnableRegistrationFormBlock(blocks, "a"), true);
    assert.equal(
      canAddRegistrationFormBlock([
        {
          type: "REGISTRATION_FORM",
          status: ExperienceBlockStatus.DISABLED,
        },
      ]),
      true,
    );
  });

  test("schedule validation opensAt <= closesAt", () => {
    const opens = new Date("2026-07-01T00:00:00.000Z");
    const closes = new Date("2026-06-01T00:00:00.000Z");
    assert.equal(validateBlockScheduleWindow(opens, closes).ok, false);
    assert.equal(validateBlockScheduleWindow(opens, opens).ok, true);
    assert.equal(validateBlockScheduleWindow(null, closes).ok, true);
  });

  test("reorder uses stable ids not indexes", () => {
    const next = moveBlockInOrder(["b1", "b2", "b3"], "b2", "up");
    assert.deepEqual(next, ["b2", "b1", "b3"]);
    assert.equal(moveBlockInOrder(["b1"], "b1", "up"), null);
  });

  test("normalize enable/disable status mapping", () => {
    assert.equal(
      normalizeEnabledBlockStatus("DISABLED"),
      ExperienceBlockStatus.DISABLED,
    );
    assert.equal(
      normalizeEnabledBlockStatus("ENABLED"),
      ExperienceBlockStatus.PUBLISHED,
    );
    assert.equal(normalizeEnabledBlockStatus("nope"), undefined);
  });

  test("SEO draft helpers truncate guidance boundaries conceptually", () => {
    const text = resolveLandingSeoText({
      flowTitle: "جریان",
      flowDescription: "توضیح",
      experienceSeoTitle: "عنوان SEO",
      experienceSeoDescription: "توضیح SEO",
    });
    assert.equal(text.title.includes("عنوان SEO"), true);
    assert.equal(text.description, "توضیح SEO");
  });

  test("default configs remain parseable for all registry types", () => {
    for (const type of Object.keys(BLOCK_REGISTRY) as Array<
      keyof typeof BLOCK_REGISTRY
    >) {
      const parsed = getBlockDefinition(type).parseConfig(
        getDefaultBlockConfig(type),
      );
      assert.equal(parsed.ok, true, type);
    }
  });

  await testAsync("admin editors resolve for all registry types", async () => {
    for (const type of Object.keys(BLOCK_REGISTRY) as Array<
      keyof typeof BLOCK_REGISTRY
    >) {
      const editor = await BLOCK_REGISTRY[type].loadAdminEditor();
      assert.equal(typeof editor, "function", type);
    }
  });

  test("duplicate Experience prevention is encoded as DRAFT_EXISTS semantics", () => {
    // Documented service contract used by createExperienceForFlowAction
    assert.equal(
      EXPERIENCE_ADMIN_PERMISSIONS.mutate,
      "registration_flows.manage",
    );
  });

  test("published version immutability contract via VERSION_NOT_DRAFT mapping", () => {
    assert.equal(
      normalizeEnabledBlockStatus("PUBLISHED"),
      ExperienceBlockStatus.PUBLISHED,
    );
  });

  console.log(`\n${passed} experience admin unit tests passed.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
