/**
 * Trusted mutation Origin checks (Nginx + Host header scenarios).
 */

import assert from "node:assert/strict";
import {
  resetTrustedAppHostnamesCacheForTests,
  validateTrustedMutationOrigin,
} from "../lib/http/trusted-mutation-origin";

let passed = 0;
function ok(name: string) {
  passed += 1;
  console.log(`✓ ${name}`);
}

function req(
  url: string,
  headers: Record<string, string>,
): Request {
  return new Request(url, { method: "POST", headers });
}

const prevEnv = process.env.NODE_ENV;
Object.defineProperty(process.env, "NODE_ENV", {
  value: "production",
  writable: true,
  configurable: true,
});

try {
  resetTrustedAppHostnamesCacheForTests();

  ok("moshaver production proxy Host + Origin match");
  assert.equal(
    validateTrustedMutationOrigin(
      req("http://127.0.0.1:3000/api/admin/counselor/students/x/choice-draft/import", {
        Host: "moshaver.setareganplus.ir",
        Origin: "https://moshaver.setareganplus.ir",
        "X-Forwarded-Proto": "https",
      }),
    ).ok,
    true,
  );

  ok("apex setareganplus.ir allowed");
  assert.equal(
    validateTrustedMutationOrigin(
      req("http://127.0.0.1:3000/api/test", {
        Host: "setareganplus.ir",
        Origin: "https://setareganplus.ir",
        "X-Forwarded-Proto": "https",
      }),
    ).ok,
    true,
  );

  ok("entekhab host allowed");
  assert.equal(
    validateTrustedMutationOrigin(
      req("http://127.0.0.1:3000/api/test", {
        Host: "entekhab.setareganplus.ir",
        Origin: "https://entekhab.setareganplus.ir",
        "X-Forwarded-Proto": "https",
      }),
    ).ok,
    true,
  );

  ok("www origin with apex Host equivalent");
  assert.equal(
    validateTrustedMutationOrigin(
      req("http://127.0.0.1:3000/api/test", {
        Host: "setareganplus.ir",
        Origin: "https://www.setareganplus.ir",
        "X-Forwarded-Proto": "https",
      }),
    ).ok,
    true,
  );

  ok("evil external origin rejected");
  assert.equal(
    validateTrustedMutationOrigin(
      req("http://127.0.0.1:3000/api/test", {
        Host: "moshaver.setareganplus.ir",
        Origin: "https://evil.example",
        "X-Forwarded-Proto": "https",
      }),
    ).ok,
    false,
  );

  ok("Origin null rejected");
  assert.equal(
    validateTrustedMutationOrigin(
      req("http://127.0.0.1:3000/api/test", {
        Host: "moshaver.setareganplus.ir",
        Origin: "null",
      }),
    ).ok,
    false,
  );

  ok("missing Origin and Referer rejected");
  assert.equal(
    validateTrustedMutationOrigin(
      req("http://127.0.0.1:3000/api/test", {
        Host: "moshaver.setareganplus.ir",
      }),
    ).ok,
    false,
  );

  ok("http origin rejected in production");
  assert.equal(
    validateTrustedMutationOrigin(
      req("http://127.0.0.1:3000/api/test", {
        Host: "moshaver.setareganplus.ir",
        Origin: "http://moshaver.setareganplus.ir",
      }),
    ).ok,
    false,
  );

  ok("old bug: localhost request.url without Host header fails");
  assert.equal(
    validateTrustedMutationOrigin(
      req("http://127.0.0.1:3000/api/test", {
        Origin: "https://moshaver.setareganplus.ir",
      }),
    ).ok,
    false,
  );

  console.log(`\n${passed} trusted mutation origin tests passed`);
} finally {
  Object.defineProperty(process.env, "NODE_ENV", {
    value: prevEnv,
    writable: true,
    configurable: true,
  });
  resetTrustedAppHostnamesCacheForTests();
}
