/**
 * Pure unit tests for RegistrationFlow timed discount.
 * Run: npx tsx scripts/registration-timed-discount-unit-tests.ts
 */

import assert from "node:assert/strict";
import {
  isTimedDiscountWindowActive,
  resolveTimedDiscountPricing,
  validateTimedDiscountFormInput,
} from "../lib/registration/timed-discount";

let passed = 0;

function test(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`✓ ${name}`);
}

const base = {
  paymentAmountRials: 1_000_000,
  saleAmountRials: 700_000 as number | null,
  discountStartsAt: null as Date | null,
  discountEndsAt: null as Date | null,
  pricingBadge: "فروش ویژه" as string | null,
  showDiscountCountdown: true,
  isFree: false,
};

test("تخفیف فعال داخل بازه", () => {
  const starts = new Date("2026-07-01T00:00:00.000Z");
  const ends = new Date("2026-07-31T23:59:59.000Z");
  const now = new Date("2026-07-15T12:00:00.000Z");
  const resolved = resolveTimedDiscountPricing(
    { ...base, discountStartsAt: starts, discountEndsAt: ends },
    now,
  );
  assert.equal(resolved.discountActive, true);
  assert.equal(resolved.finalAmountRials, 700_000);
  assert.equal(resolved.amountRials, 1_000_000);
  assert.equal(resolved.discountRials, 300_000);
  assert.equal(resolved.pricingBadge, "فروش ویژه");
  assert.equal(resolved.showCountdown, true);
});

test("تخفیف هنوز شروع نشده", () => {
  const starts = new Date("2026-08-01T00:00:00.000Z");
  const ends = new Date("2026-08-31T00:00:00.000Z");
  const now = new Date("2026-07-15T12:00:00.000Z");
  const resolved = resolveTimedDiscountPricing(
    { ...base, discountStartsAt: starts, discountEndsAt: ends },
    now,
  );
  assert.equal(resolved.discountActive, false);
  assert.equal(resolved.finalAmountRials, 1_000_000);
  assert.equal(resolved.pricingBadge, null);
  assert.equal(resolved.showCountdown, false);
  assert.equal(
    isTimedDiscountWindowActive(
      { ...base, discountStartsAt: starts, discountEndsAt: ends },
      now,
    ),
    false,
  );
});

test("تخفیف تمام شده", () => {
  const starts = new Date("2026-06-01T00:00:00.000Z");
  const ends = new Date("2026-06-30T00:00:00.000Z");
  const now = new Date("2026-07-15T12:00:00.000Z");
  const resolved = resolveTimedDiscountPricing(
    { ...base, discountStartsAt: starts, discountEndsAt: ends },
    now,
  );
  assert.equal(resolved.discountActive, false);
  assert.equal(resolved.finalAmountRials, 1_000_000);
});

test("بدون تاریخ شروع — از الان فعال است", () => {
  const ends = new Date("2026-12-31T00:00:00.000Z");
  const now = new Date("2026-07-15T12:00:00.000Z");
  const resolved = resolveTimedDiscountPricing(
    { ...base, discountStartsAt: null, discountEndsAt: ends },
    now,
  );
  assert.equal(resolved.discountActive, true);
  assert.equal(resolved.finalAmountRials, 700_000);
});

test("بدون تاریخ پایان — تا اطلاع ثانوی فعال است", () => {
  const starts = new Date("2026-01-01T00:00:00.000Z");
  const now = new Date("2026-07-15T12:00:00.000Z");
  const resolved = resolveTimedDiscountPricing(
    {
      ...base,
      discountStartsAt: starts,
      discountEndsAt: null,
      showDiscountCountdown: true,
    },
    now,
  );
  assert.equal(resolved.discountActive, true);
  assert.equal(resolved.finalAmountRials, 700_000);
  // Countdown needs an end date
  assert.equal(resolved.showCountdown, false);
});

test("قیمت تخفیفی نامعتبر (>= قیمت اصلی)", () => {
  const now = new Date("2026-07-15T12:00:00.000Z");
  const resolved = resolveTimedDiscountPricing(
    { ...base, saleAmountRials: 1_000_000 },
    now,
  );
  assert.equal(resolved.discountActive, false);
  assert.equal(resolved.finalAmountRials, 1_000_000);

  const validated = validateTimedDiscountFormInput({
    enabled: true,
    isFree: false,
    paymentAmountRials: 1_000_000,
    saleAmountRials: 1_000_000,
    pricingBadge: "x",
    discountStartsAt: null,
    discountEndsAt: null,
    showDiscountCountdown: true,
  });
  assert.equal(validated.ok, false);
  if (!validated.ok) {
    assert.match(validated.fieldErrors.saleAmountRials ?? "", /کمتر/);
  }
});

test("تخفیف برای جریان رایگان اعمال نمی‌شود", () => {
  const now = new Date("2026-07-15T12:00:00.000Z");
  const resolved = resolveTimedDiscountPricing({ ...base, isFree: true }, now);
  assert.equal(resolved.discountActive, false);
  assert.equal(resolved.finalAmountRials, 0);
  assert.equal(resolved.amountRials, 0);

  const cleared = validateTimedDiscountFormInput({
    enabled: true,
    isFree: true,
    paymentAmountRials: 0,
    saleAmountRials: 100,
    pricingBadge: "badge",
    discountStartsAt: new Date(),
    discountEndsAt: new Date(),
    showDiscountCountdown: true,
  });
  assert.equal(cleared.ok, true);
  if (cleared.ok) {
    assert.equal(cleared.saleAmountRials, null);
    assert.equal(cleared.pricingBadge, null);
    assert.equal(cleared.discountStartsAt, null);
    assert.equal(cleared.discountEndsAt, null);
  }
});

test("غیرفعال‌سازی تخفیف فیلدها را پاک می‌کند", () => {
  const cleared = validateTimedDiscountFormInput({
    enabled: false,
    isFree: false,
    paymentAmountRials: 1_000_000,
    saleAmountRials: 500_000,
    pricingBadge: "badge",
    discountStartsAt: new Date("2026-07-01T00:00:00.000Z"),
    discountEndsAt: new Date("2026-07-31T00:00:00.000Z"),
    showDiscountCountdown: false,
  });
  assert.equal(cleared.ok, true);
  if (cleared.ok) {
    assert.equal(cleared.saleAmountRials, null);
    assert.equal(cleared.pricingBadge, null);
    assert.equal(cleared.discountStartsAt, null);
    assert.equal(cleared.discountEndsAt, null);
    assert.equal(cleared.showDiscountCountdown, true);
  }
});

test("پایان قبل از شروع خطا می‌دهد", () => {
  const validated = validateTimedDiscountFormInput({
    enabled: true,
    isFree: false,
    paymentAmountRials: 1_000_000,
    saleAmountRials: 500_000,
    pricingBadge: null,
    discountStartsAt: new Date("2026-07-20T00:00:00.000Z"),
    discountEndsAt: new Date("2026-07-10T00:00:00.000Z"),
    showDiscountCountdown: true,
  });
  assert.equal(validated.ok, false);
  if (!validated.ok) {
    assert.ok(validated.fieldErrors.discountEndsAt);
  }
});

console.log(`\n${passed} timed-discount tests passed.`);
