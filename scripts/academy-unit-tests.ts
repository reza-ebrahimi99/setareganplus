import assert from "node:assert/strict";
import { maskIranianMobile } from "@/lib/academy/money";

assert.equal(maskIranianMobile("09121234567"), "0912***4567");
assert.equal(maskIranianMobile(""), "—");

console.info("[academy-unit-tests] all passed");
