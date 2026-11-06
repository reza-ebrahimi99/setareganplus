import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashAccessCode, hashOtpCode, hashesEqual, normalizeAccessCode, rateDecision, reminderDue } from "./access";
import { resolveSmsEnv } from "./sms-send";
import { clipParam, renderSms } from "./text";
import { validateDraft } from "./validate";

const SECRET = "test-secret-test-secret-test-secret-xx";

describe("student access codes", () => {
  it("normalises dashes and Persian digits and rejects the wrong length", () => {
    const code = "ABCDE23456";
    assert.equal(normalizeAccessCode("  abcde-23456 "), code);
    assert.equal(normalizeAccessCode("abcde-۲۳۴۵۶"), code);
    assert.equal(normalizeAccessCode("ABCD-E23456"), code);
    assert.equal(normalizeAccessCode("ABCDE2345"), null);
    assert.equal(normalizeAccessCode("ABCDE2345۰"), null);
    assert.equal(normalizeAccessCode("ABCDE2345O"), null);
  });

  it("stores an HMAC that is not the code and depends on the secret", () => {
    const code = "ABCDE23456";
    const hash = hashAccessCode(code, SECRET);
    assert.notEqual(hash, code);
    assert.equal(hash, hashAccessCode(code, SECRET));
    assert.notEqual(hash, hashAccessCode(code, SECRET + "x"));
    assert.equal(hashesEqual(hash, hashAccessCode(code, SECRET)), true);
    assert.equal(hashesEqual(hash, hashAccessCode("ABCDE23457", SECRET)), false);
    assert.equal(hashesEqual("ab", "abcd"), false);
  });

  it("rate-limits before the next guess", () => {
    assert.equal(rateDecision(0, 8), "allow");
    assert.equal(rateDecision(7, 8), "allow");
    assert.equal(rateDecision(8, 8), "block");
  });

  it("hashes OTP with the mobile so one code does not unlock another phone", () => {
    const a = hashOtpCode("12345", "09120000000", SECRET);
    assert.notEqual(a, hashOtpCode("12345", "09120000001", SECRET));
    assert.notEqual(a, "12345");
  });
});

describe("booking draft and reminder", () => {
  it("rejects a missing grade and accepts a parent booking", () => {
    const bad = validateDraft({ audience: "PUBLIC", mode: "ONLINE", bookerRole: "PARENT", bookerName: "مریم رضایی", studentName: "نگار رضایی", grade: "g1", startsAt: new Date().toISOString(), consultantId: "fastest" });
    assert.equal(bad.ok, false);
    const good = validateDraft({ audience: "PUBLIC", mode: "IN_PERSON", bookerRole: "STUDENT", bookerName: "", studentName: "نگار رضایی", grade: "g2", note: "  سلام  ", startsAt: "2026-11-07T12:30:00.000Z", consultantId: "fastest" });
    assert.equal(good.ok, true);
    if (good.ok) {
      assert.equal(good.value.bookerName, "نگار رضایی");
      assert.equal(good.value.note, "سلام");
      assert.equal(good.value.fastest, true);
    }
  });

  it("renders the admin SMS text and clips template parameters", () => {
    const text = renderSms("سلام {name}، {date} ساعت {time} با {consultant}. کد {code}", { name: "نگار", date: "۱۶ آبان", time: "۱۶:۰۰", consultant: "دکتر آزمایشی", code: "AB12CD34" });
    assert.match(text, /نگار/);
    assert.match(text, /AB12CD34/);
    assert.equal(text.includes("{name}"), false);
    const clipped = clipParam("12345678901234567890123456");
    assert.equal(clipped.length, 25);
    assert.equal(clipped.endsWith("…"), true);
  });

  it("sends a reminder only inside the window and only once per slot", () => {
    const now = new Date("2026-11-07T08:00:00.000Z");
    const soon = new Date("2026-11-07T20:00:00.000Z");
    const later = new Date("2026-11-09T08:00:00.000Z");
    assert.equal(reminderDue(now, soon, 24, false), true);
    assert.equal(reminderDue(now, soon, 24, true), false);
    assert.equal(reminderDue(now, later, 24, false), false);
    assert.equal(reminderDue(now, new Date("2026-11-07T07:00:00.000Z"), 24, false), false);
    assert.equal(reminderDue(now, soon, 0, false), false);
  });
});

describe("SMS.ir env", () => {
  it("stays off without the enable flag and refuses a foreign host", () => {
    const off = resolveSmsEnv({ STAROS_SMS_ENABLED: "false", SMSIR_API_KEY: "secret" });
    assert.equal(off.enabled, false);
    assert.match(off.why ?? "", /غیرفعال/);
    const foreign = resolveSmsEnv({ STAROS_SMS_ENABLED: "true", SMSIR_API_KEY: "secret", SMSIR_API_BASE_URL: "https://evil.example/api" });
    assert.equal(foreign.baseUrl, "https://api.sms.ir");
    const ok = resolveSmsEnv({ NODE_ENV: "production", STAROS_SMS_ENABLED: "true", SMSIR_API_KEY: "secret", SMSIR_API_BASE_URL: "https://api.sms.ir/v1", SMSIR_LINE_NUMBER: "3000", SMSIR_TEST_BASE_URL: "http://localhost:9" });
    assert.equal(ok.baseUrl, "https://api.sms.ir");
    assert.equal(ok.lineNumber, "3000");
    assert.equal(ok.why, null);
  });
});
