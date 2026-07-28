/**
 * Checkpoint 2 — Experience BLOCK_REGISTRY exhaustive unit validation.
 * No DB. Uses existing tsx + node:assert infrastructure (no new packages).
 *
 * Run: npx tsx scripts/experience-block-registry-unit-tests.ts
 *   or: npm run test:experience-registry
 */

import assert from "node:assert/strict";
import {
  adminEditorChromeFromRegistry,
  BLOCK_REGISTRY,
  BLOCK_TYPE_OPTIONS,
  getBlockDefinition,
  getDefaultBlockConfig,
  isExperienceBlockType,
  loadAdminBlockEditor,
  loadPublicBlockRenderer,
  type ExperienceBlockType,
} from "../lib/experience/registry";
import {
  parseExperienceBlockConfig,
  parseExperienceBlockConfigFromRow,
} from "../lib/experience/parse-block-config";
import type { BlockMediaRole } from "../lib/experience/media-types";
import type { BlockCapabilities } from "../lib/experience/definition-types";

let passed = 0;

function test(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(() => fn())
    .then(() => {
      passed += 1;
      console.log(`✓ ${name}`);
    });
}

const EXPECTED_TYPES = [
  "HERO",
  "IMAGE",
  "RICH_TEXT",
  "FEATURES",
  "PRICING",
  "COUNTDOWN",
  "CAPACITY",
  "REGISTRATION_FORM",
  "CTA",
  "SPACER",
] as const satisfies readonly ExperienceBlockType[];

const EXPECTED_MEDIA_ROLES: Record<ExperienceBlockType, readonly BlockMediaRole[]> =
  {
    HERO: ["primary", "mobile"],
    IMAGE: ["primary"],
    RICH_TEXT: [],
    FEATURES: [],
    PRICING: [],
    COUNTDOWN: [],
    CAPACITY: [],
    REGISTRATION_FORM: [],
    CTA: ["background"],
    SPACER: [],
  };

const CAPABILITY_KEYS: (keyof BlockCapabilities)[] = [
  "supportsVisibility",
  "supportsScheduling",
  "supportsAnimation",
  "supportsTheme",
  "supportsBindings",
];

const BINDING_FORBIDDEN: Record<
  "PRICING" | "COUNTDOWN" | "CAPACITY" | "REGISTRATION_FORM",
  readonly string[]
> = {
  PRICING: [
    "paymentAmountRials",
    "saleAmountRials",
    "paymentMode",
    "pricingBadge",
    "discountStartsAt",
    "discountEndsAt",
    "finalAmountRials",
    "discountRials",
  ],
  COUNTDOWN: [
    "discountStartsAt",
    "discountEndsAt",
    "saleAmountRials",
    "endsAtIso",
  ],
  CAPACITY: ["capacity", "registrationCount", "remainingCapacity", "isFull"],
  REGISTRATION_FORM: ["formId", "formSlug", "formVersionId", "fields"],
};

async function main() {
  // ── Registry lookup for every known block ──────────────────────────────
  await test("registry contains exactly the 10 Sprint A block types", () => {
    const keys = Object.keys(BLOCK_REGISTRY).sort();
    assert.deepEqual(keys, [...EXPECTED_TYPES].sort());
    assert.equal(keys.length, 10);
  });

  for (const type of EXPECTED_TYPES) {
    await test(`registry lookup resolves ${type}`, () => {
      assert.equal(isExperienceBlockType(type), true);
      const def = getBlockDefinition(type);
      assert.ok(def);
      assert.equal(def.type, type);
      assert.equal(typeof def.labelFa, "string");
      assert.ok(def.labelFa.length > 0);
      assert.equal(typeof def.descriptionFa, "string");
      assert.ok(def.descriptionFa.length > 0);
      assert.equal(def.configVersion, 1);
      for (const key of CAPABILITY_KEYS) {
        assert.equal(typeof def.capabilities[key], "boolean");
      }
    });
  }

  // ── Unknown block handling ─────────────────────────────────────────────
  await test("unknown block type is rejected by isExperienceBlockType", () => {
    assert.equal(isExperienceBlockType("UNKNOWN"), false);
    assert.equal(isExperienceBlockType("HERO "), false);
    assert.equal(isExperienceBlockType("hero"), false);
    assert.equal(isExperienceBlockType(""), false);
  });

  await test("getBlockDefinition returns null for unknown type", () => {
    assert.equal(getBlockDefinition("GALLERY"), null);
    assert.equal(getBlockDefinition("VIDEO"), null);
  });

  await test("parseExperienceBlockConfigFromRow rejects unknown type", () => {
    const result = parseExperienceBlockConfigFromRow("NOT_A_BLOCK", { v: 1 });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /ناشناخته/);
    }
  });

  // ── defaultConfig validity (parses through registry) ───────────────────
  for (const type of EXPECTED_TYPES) {
    await test(`defaultConfig for ${type} passes parseConfig`, () => {
      const def = getBlockDefinition(type);
      assert.ok(def);
      const defaults = getDefaultBlockConfig(type);
      const parsed = def.parseConfig(defaults);
      assert.equal(parsed.ok, true, `${type} defaultConfig failed parse`);
      if (parsed.ok) {
        assert.equal(parsed.data.v, 1);
        const roundTrip = def.parseConfig(parsed.data);
        assert.equal(roundTrip.ok, true);
        if (roundTrip.ok) {
          assert.deepEqual(roundTrip.data, parsed.data);
        }
      }
      const viaHelper = parseExperienceBlockConfig(type, defaults);
      assert.equal(viaHelper.ok, true);
    });
  }

  // ── Valid config parsing for all 10 blocks ─────────────────────────────
  await test("HERO valid custom config", () => {
    const parsed = parseExperienceBlockConfig("HERO", {
      v: 1,
      headline: "ثبت‌نام دوره",
      subheadline: "توضیح",
      eyebrow: "ویژه",
      align: "center",
      overlay: "strong",
      primaryCta: { label: "شروع", href: "/register/demo" },
      secondaryCta: { label: "اطلاعات", href: "/about" },
    });
    assert.equal(parsed.ok, true);
  });

  await test("IMAGE valid custom config", () => {
    const parsed = parseExperienceBlockConfig("IMAGE", {
      v: 1,
      aspect: "4/3",
      objectFit: "contain",
      caption: "کپشن",
      altOverride: "alt",
      linkHref: "/gallery",
    });
    assert.equal(parsed.ok, true);
  });

  await test("RICH_TEXT valid custom config", () => {
    const parsed = parseExperienceBlockConfig("RICH_TEXT", {
      v: 1,
      title: "عنوان",
      body: "متن بدنه\nخط دوم",
      textAlign: "center",
      maxWidth: "wide",
    });
    assert.equal(parsed.ok, true);
  });

  await test("FEATURES valid custom config", () => {
    const parsed = parseExperienceBlockConfig("FEATURES", {
      v: 1,
      title: "مزایا",
      items: [
        { title: "الف", description: "د۱", iconKey: "star" },
        { title: "ب" },
      ],
    });
    assert.equal(parsed.ok, true);
  });

  await test("PRICING valid presentation-only config", () => {
    const parsed = parseExperienceBlockConfig("PRICING", {
      v: 1,
      showPaymentModeLabel: false,
      variant: "compact",
      sectionTitle: "هزینه",
    });
    assert.equal(parsed.ok, true);
  });

  await test("COUNTDOWN valid presentation-only config", () => {
    const parsed = parseExperienceBlockConfig("COUNTDOWN", {
      v: 1,
      showWhenInactive: true,
      heading: "پایان تخفیف",
    });
    assert.equal(parsed.ok, true);
  });

  await test("CAPACITY valid presentation-only config", () => {
    const parsed = parseExperienceBlockConfig("CAPACITY", {
      v: 1,
      showRemaining: true,
      heading: "ظرفیت",
      fullMessage: "تکمیل شد",
    });
    assert.equal(parsed.ok, true);
  });

  await test("REGISTRATION_FORM valid presentation-only config", () => {
    const parsed = parseExperienceBlockConfig("REGISTRATION_FORM", {
      v: 1,
      introHeading: "شروع",
      introBody: "توضیح",
      showStartButton: true,
      startButtonLabel: "ثبت‌نام",
    });
    assert.equal(parsed.ok, true);
  });

  await test("CTA valid custom config", () => {
    const parsed = parseExperienceBlockConfig("CTA", {
      v: 1,
      title: "اقدام",
      description: "اکنون",
      align: "start",
      primaryCta: { label: "برو", href: "/register/x" },
    });
    assert.equal(parsed.ok, true);
  });

  await test("SPACER valid custom config", () => {
    const parsed = parseExperienceBlockConfig("SPACER", {
      v: 1,
      size: "xl",
    });
    assert.equal(parsed.ok, true);
  });

  // ── Invalid config rejection ───────────────────────────────────────────
  await test("HERO rejects missing headline", () => {
    const parsed = parseExperienceBlockConfig("HERO", {
      v: 1,
      align: "start",
      overlay: "soft",
    });
    assert.equal(parsed.ok, false);
  });

  await test("HERO rejects unsupported config version", () => {
    const parsed = parseExperienceBlockConfig("HERO", {
      v: 2,
      headline: "x",
      align: "start",
      overlay: "soft",
    });
    assert.equal(parsed.ok, false);
  });

  await test("IMAGE rejects invalid aspect", () => {
    const parsed = parseExperienceBlockConfig("IMAGE", {
      v: 1,
      aspect: "21/9",
      objectFit: "cover",
    });
    assert.equal(parsed.ok, false);
  });

  await test("RICH_TEXT rejects empty body", () => {
    const parsed = parseExperienceBlockConfig("RICH_TEXT", {
      v: 1,
      body: "   ",
      textAlign: "start",
      maxWidth: "prose",
    });
    assert.equal(parsed.ok, false);
  });

  await test("FEATURES rejects empty items", () => {
    const parsed = parseExperienceBlockConfig("FEATURES", {
      v: 1,
      items: [],
    });
    assert.equal(parsed.ok, false);
  });

  await test("FEATURES rejects item without title", () => {
    const parsed = parseExperienceBlockConfig("FEATURES", {
      v: 1,
      items: [{ description: "only desc" }],
    });
    assert.equal(parsed.ok, false);
  });

  await test("CTA rejects missing title", () => {
    const parsed = parseExperienceBlockConfig("CTA", {
      v: 1,
      align: "center",
    });
    assert.equal(parsed.ok, false);
  });

  await test("CTA rejects incomplete primary button", () => {
    const parsed = parseExperienceBlockConfig("CTA", {
      v: 1,
      title: "عنوان",
      align: "center",
      primaryCta: { label: "فقط برچسب", href: "" },
    });
    assert.equal(parsed.ok, false);
  });

  await test("SPACER rejects invalid size", () => {
    const parsed = parseExperienceBlockConfig("SPACER", {
      v: 1,
      size: "xxl",
    });
    assert.equal(parsed.ok, false);
  });

  await test("non-object config rejected for PRICING", () => {
    const parsed = parseExperienceBlockConfig("PRICING", null);
    assert.equal(parsed.ok, false);
  });

  // ── Forbidden binding / source-of-truth keys ───────────────────────────
  for (const [type, keys] of Object.entries(BINDING_FORBIDDEN) as Array<
    [keyof typeof BINDING_FORBIDDEN, readonly string[]]
  >) {
    for (const key of keys) {
      await test(`${type} rejects forbidden key «${key}»`, () => {
        const base = { ...getDefaultBlockConfig(type), [key]: 123 };
        const parsed = parseExperienceBlockConfig(type, base);
        assert.equal(parsed.ok, false);
        if (!parsed.ok) {
          assert.match(parsed.error, new RegExp(key));
        }
      });
    }
  }

  // ── Media role validation ──────────────────────────────────────────────
  for (const type of EXPECTED_TYPES) {
    await test(`mediaRoles for ${type} match contract`, () => {
      const def = getBlockDefinition(type);
      assert.ok(def);
      assert.deepEqual([...def.mediaRoles], [...EXPECTED_MEDIA_ROLES[type]]);
    });

    await test(`extractMediaLinks for ${type} respects roles`, () => {
      const def = getBlockDefinition(type);
      assert.ok(def);
      const formMedia = {
        primary: "media-primary",
        mobile: "media-mobile",
        background: "media-bg",
      };
      const links = def.extractMediaLinks(formMedia);
      assert.equal(links.length, def.mediaRoles.length);
      for (let i = 0; i < def.mediaRoles.length; i += 1) {
        assert.equal(links[i].role, def.mediaRoles[i]);
        assert.equal(links[i].sortOrder, i);
        assert.ok(links[i].mediaId.length > 0);
      }
      const empty = def.extractMediaLinks({});
      assert.equal(empty.length, 0);
    });
  }

  // ── duplicateConfig deep-copy safety ───────────────────────────────────
  await test("FEATURES duplicateConfig deep-copies items array", () => {
    const def = getBlockDefinition("FEATURES");
    assert.ok(def);
    const original = getDefaultBlockConfig("FEATURES");
    const copy = def.duplicateConfig(original);
    assert.notEqual(copy.items, original.items);
    assert.notEqual(copy.items[0], original.items[0]);
    copy.items[0].title = "MUTATED";
    assert.notEqual(original.items[0].title, "MUTATED");
  });

  await test("HERO duplicateConfig deep-copies nested CTA buttons", () => {
    const def = getBlockDefinition("HERO");
    assert.ok(def);
    const original = parseExperienceBlockConfig("HERO", {
      v: 1,
      headline: "H",
      align: "start",
      overlay: "soft",
      primaryCta: { label: "A", href: "/a" },
      secondaryCta: { label: "B", href: "/b" },
    });
    assert.equal(original.ok, true);
    if (!original.ok) return;
    const copy = def.duplicateConfig(original.data);
    assert.ok(copy.primaryCta);
    assert.ok(copy.secondaryCta);
    assert.notEqual(copy.primaryCta, original.data.primaryCta);
    assert.notEqual(copy.secondaryCta, original.data.secondaryCta);
    copy.primaryCta!.label = "MUTATED";
    assert.equal(original.data.primaryCta?.label, "A");
  });

  await test("CTA duplicateConfig deep-copies nested CTA buttons", () => {
    const def = getBlockDefinition("CTA");
    assert.ok(def);
    const original = parseExperienceBlockConfig("CTA", {
      v: 1,
      title: "T",
      align: "center",
      primaryCta: { label: "Go", href: "/go" },
    });
    assert.equal(original.ok, true);
    if (!original.ok) return;
    const copy = def.duplicateConfig(original.data);
    assert.ok(copy.primaryCta);
    assert.notEqual(copy.primaryCta, original.data.primaryCta);
    copy.primaryCta!.href = "/mutated";
    assert.equal(original.data.primaryCta?.href, "/go");
  });

  for (const type of EXPECTED_TYPES) {
    await test(`duplicateConfig for ${type} is not the same object reference`, () => {
      const def = BLOCK_REGISTRY[type];
      const original = def.defaultConfig;
      // Per-type narrowing: union of duplicateConfig params collapses to intersection.
      const copy = (
        def.duplicateConfig as (config: typeof original) => typeof original
      )(original);
      assert.notEqual(copy, original);
      const reparsed = def.parseConfig(copy);
      assert.equal(reparsed.ok, true);
    });
  }

  // ── Lazy public / admin loader resolution ──────────────────────────────
  for (const type of EXPECTED_TYPES) {
    await test(`lazy public loader resolves for ${type}`, async () => {
      const renderer = await loadPublicBlockRenderer(type);
      assert.equal(typeof renderer, "function");
    });

    await test(`lazy admin loader resolves for ${type}`, async () => {
      const editor = await loadAdminBlockEditor(type);
      assert.equal(typeof editor, "function");
    });
  }

  // ── Registry metadata is the only source for admin chrome ──────────────
  await test("BLOCK_TYPE_OPTIONS is derived only from BLOCK_REGISTRY", () => {
    assert.equal(BLOCK_TYPE_OPTIONS.length, EXPECTED_TYPES.length);
    for (const option of BLOCK_TYPE_OPTIONS) {
      const def = BLOCK_REGISTRY[option.type];
      assert.equal(option.labelFa, def.labelFa);
      assert.equal(option.descriptionFa, def.descriptionFa);
      assert.equal(option.categoryFa, def.categoryFa);
      assert.equal(option.iconKey, def.iconKey ?? null);
      assert.deepEqual(option.capabilities, def.capabilities);
    }
  });

  await test("every block definition declares categoryFa and constrained iconKey", () => {
    for (const type of EXPECTED_TYPES) {
      const def = BLOCK_REGISTRY[type];
      assert.ok(def.categoryFa.length > 0, type);
      if (def.iconKey) {
        assert.ok(
          ["hero", "image", "text", "features", "pricing", "countdown", "capacity", "form", "cta", "spacer"].includes(
            def.iconKey,
          ),
          type,
        );
      }
    }
  });

  await test("adminEditorChromeFromRegistry matches BLOCK_REGISTRY labels", () => {
    for (const type of EXPECTED_TYPES) {
      const chrome = adminEditorChromeFromRegistry(type);
      assert.equal(chrome.labelFa, BLOCK_REGISTRY[type].labelFa);
      assert.equal(chrome.descriptionFa, BLOCK_REGISTRY[type].descriptionFa);
    }
  });

  await test("binding-capable blocks declare supportsBindings=true", () => {
    assert.equal(BLOCK_REGISTRY.PRICING.capabilities.supportsBindings, true);
    assert.equal(BLOCK_REGISTRY.COUNTDOWN.capabilities.supportsBindings, true);
    assert.equal(BLOCK_REGISTRY.CAPACITY.capabilities.supportsBindings, true);
    assert.equal(
      BLOCK_REGISTRY.REGISTRATION_FORM.capabilities.supportsBindings,
      true,
    );
    assert.equal(BLOCK_REGISTRY.HERO.capabilities.supportsBindings, false);
    assert.equal(BLOCK_REGISTRY.SPACER.capabilities.supportsBindings, false);
  });

  console.log(`\n${passed} experience registry tests passed.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
