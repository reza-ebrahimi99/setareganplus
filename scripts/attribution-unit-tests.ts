/**
 * Admissions CRM v2 — Attribution Engine unit tests (Sprint 2.6).
 * Pure / in-memory — no database required.
 */

import assert from "node:assert/strict";
import {
  AttributionPolicyMode,
  RegistrationFlowPaymentMode,
} from "../generated/prisma/enums";
import { pickAttributedUserId } from "../lib/crm/attribution-policy";
import {
  parseRevenueKeyKind,
  paymentIntentRevenueKey,
  registrationWaivedRevenueKey,
  selectCanonicalSnapshotsForKpi,
  shouldEmitRegistrationWaivedSnapshot,
} from "../lib/crm/attribution-revenue-contract";
import {
  applyOwnershipPeriodTransition,
  mapLeadOwnershipHistorySource,
} from "../lib/crm/ownership-history";
import { buildAttributionCorrelationId } from "../lib/crm/attribution-observability";

function test(name: string, fn: () => void) {
  fn();
  console.log(`✓ ${name}`);
}

// ── Revenue contract ──────────────────────────────────────────────────────────

test("payment retry / duplicate callback share one revenue key", () => {
  const a = paymentIntentRevenueKey("pi_1");
  const b = paymentIntentRevenueKey("pi_1");
  assert.equal(a, b);
  assert.equal(parseRevenueKeyKind(a), "PAYMENT_INTENT");
});

test("FREE emits REGISTRATION_WAIVED; OPTIONAL skip does not", () => {
  assert.equal(
    shouldEmitRegistrationWaivedSnapshot(RegistrationFlowPaymentMode.FREE),
    true,
  );
  assert.equal(
    shouldEmitRegistrationWaivedSnapshot(RegistrationFlowPaymentMode.OPTIONAL),
    false,
  );
  assert.equal(
    shouldEmitRegistrationWaivedSnapshot(
      RegistrationFlowPaymentMode.OPTIONAL_PAYMENT,
    ),
    false,
  );
  assert.equal(
    shouldEmitRegistrationWaivedSnapshot(
      RegistrationFlowPaymentMode.FIXED_PRICE,
    ),
    false,
  );
});

test("KPI canonical selection prefers PAYMENT_INTENT over WAIVED", () => {
  const reg = "reg_1";
  const selected = selectCanonicalSnapshotsForKpi([
    {
      id: "s-waived",
      revenueKey: registrationWaivedRevenueKey(reg),
      registrationId: reg,
      amountRials: 0,
      status: "ATTRIBUTED",
    },
    {
      id: "s-paid",
      revenueKey: paymentIntentRevenueKey("pi_9"),
      registrationId: reg,
      amountRials: 1_000_000,
      status: "ATTRIBUTED",
    },
  ]);
  assert.equal(selected.length, 1);
  assert.equal(selected[0]!.id, "s-paid");
});

test("KPI ignores PENDING and keeps waived when no payment", () => {
  const reg = "reg_2";
  const selected = selectCanonicalSnapshotsForKpi([
    {
      id: "pending",
      revenueKey: paymentIntentRevenueKey("pi_pending"),
      registrationId: reg,
      amountRials: 500,
      status: "PENDING_ATTRIBUTION",
    },
    {
      id: "waived",
      revenueKey: registrationWaivedRevenueKey(reg),
      registrationId: reg,
      amountRials: 0,
      status: "ATTRIBUTED",
    },
  ]);
  assert.equal(selected.length, 1);
  assert.equal(selected[0]!.id, "waived");
});

// ── Snapshot idempotency (in-memory create-once store) ─────────────────────────

test("snapshot idempotency: second write returns ALREADY_EXISTS", () => {
  type Row = {
    revenueKey: string;
    status: "PENDING_ATTRIBUTION" | "ATTRIBUTED";
    leadId: string | null;
    attributedUserId: string | null;
  };
  const store = new Map<string, Row>();

  function createOnce(input: {
    revenueKey: string;
    leadId: string | null;
    ownerUserId: string | null;
  }): { created: boolean; reason?: string; status: Row["status"] } {
    const existing = store.get(input.revenueKey);
    if (existing?.status === "ATTRIBUTED") {
      return { created: false, reason: "ALREADY_EXISTS", status: "ATTRIBUTED" };
    }
    if (existing?.status === "PENDING_ATTRIBUTION" && input.leadId) {
      store.set(input.revenueKey, {
        revenueKey: input.revenueKey,
        status: "ATTRIBUTED",
        leadId: input.leadId,
        attributedUserId: input.ownerUserId,
      });
      return {
        created: false,
        reason: "PENDING_RECOVERED",
        status: "ATTRIBUTED",
      };
    }
    if (existing) {
      return {
        created: false,
        reason: "ALREADY_EXISTS",
        status: existing.status,
      };
    }
    const status = input.leadId ? "ATTRIBUTED" : "PENDING_ATTRIBUTION";
    store.set(input.revenueKey, {
      revenueKey: input.revenueKey,
      status,
      leadId: input.leadId,
      attributedUserId: input.leadId ? input.ownerUserId : null,
    });
    return { created: true, status };
  }

  const key = paymentIntentRevenueKey("pi_retry");
  const first = createOnce({
    revenueKey: key,
    leadId: "lead_a",
    ownerUserId: "owner_1",
  });
  const second = createOnce({
    revenueKey: key,
    leadId: "lead_a",
    ownerUserId: "owner_2",
  });
  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(second.reason, "ALREADY_EXISTS");
  assert.equal(store.get(key)!.attributedUserId, "owner_1");

  const pendingKey = paymentIntentRevenueKey("pi_pending");
  const pending = createOnce({
    revenueKey: pendingKey,
    leadId: null,
    ownerUserId: null,
  });
  assert.equal(pending.status, "PENDING_ATTRIBUTION");
  const recovered = createOnce({
    revenueKey: pendingKey,
    leadId: "lead_b",
    ownerUserId: "owner_9",
  });
  assert.equal(recovered.reason, "PENDING_RECOVERED");
  assert.equal(store.get(pendingKey)!.status, "ATTRIBUTED");
  assert.equal(store.get(pendingKey)!.attributedUserId, "owner_9");
});

// ── Policy modes ──────────────────────────────────────────────────────────────

test("CURRENT_OWNER_AT_EVENT uses current owner", () => {
  assert.equal(
    pickAttributedUserId({
      mode: AttributionPolicyMode.CURRENT_OWNER_AT_EVENT,
      currentOwnerUserId: "current",
      firstOwnerUserId: "first",
    }),
    "current",
  );
});

test("FIRST_OWNER prefers earliest owner, falls back to current", () => {
  assert.equal(
    pickAttributedUserId({
      mode: AttributionPolicyMode.FIRST_OWNER,
      currentOwnerUserId: "current",
      firstOwnerUserId: "first",
    }),
    "first",
  );
  assert.equal(
    pickAttributedUserId({
      mode: AttributionPolicyMode.FIRST_OWNER,
      currentOwnerUserId: "current",
      firstOwnerUserId: null,
    }),
    "current",
  );
});

test("owner reassignment after freeze does not change frozen credit helper", () => {
  const frozen = pickAttributedUserId({
    mode: AttributionPolicyMode.CURRENT_OWNER_AT_EVENT,
    currentOwnerUserId: "owner_at_pay",
    firstOwnerUserId: "first",
  });
  const afterReassign = pickAttributedUserId({
    mode: AttributionPolicyMode.CURRENT_OWNER_AT_EVENT,
    currentOwnerUserId: "new_owner",
    firstOwnerUserId: "first",
  });
  assert.equal(frozen, "owner_at_pay");
  assert.notEqual(frozen, afterReassign);
});

// ── Ownership history transitions ─────────────────────────────────────────────

test("ownership history transition closes open period and opens next", () => {
  const t0 = new Date("2026-01-01T00:00:00.000Z");
  const t1 = new Date("2026-02-01T00:00:00.000Z");
  const after = applyOwnershipPeriodTransition({
    periods: [{ ownerUserId: "a", effectiveFrom: t0, effectiveTo: null }],
    nextOwnerUserId: "b",
    at: t1,
  });
  assert.equal(after.length, 2);
  assert.equal(after[0]!.effectiveTo?.toISOString(), t1.toISOString());
  assert.equal(after[1]!.ownerUserId, "b");
  assert.equal(after[1]!.effectiveTo, null);
  const openCount = after.filter((p) => p.effectiveTo === null).length;
  assert.equal(openCount, 1);
});

test("history source mapping aligns with LeadOwnershipSource", () => {
  assert.equal(mapLeadOwnershipHistorySource("MANUAL"), "MANUAL");
  assert.equal(mapLeadOwnershipHistorySource("BULK"), "BULK");
  assert.equal(mapLeadOwnershipHistorySource("IMPORT"), "IMPORT");
  assert.equal(mapLeadOwnershipHistorySource("SYSTEM"), "SYSTEM");
});

test("correlation ids are stable for payment retries", () => {
  const a = buildAttributionCorrelationId({
    revenueKey: paymentIntentRevenueKey("pi_x"),
    paymentIntentId: "pi_x",
  });
  const b = buildAttributionCorrelationId({
    revenueKey: paymentIntentRevenueKey("pi_x"),
    paymentIntentId: "pi_x",
  });
  assert.equal(a, b);
  assert.equal(a, "payintent:pi_x");
});

console.log("\nAll attribution unit tests passed.");
