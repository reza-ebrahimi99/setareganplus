#!/usr/bin/env python3
"""
Idempotent production Step 10 checkout overlay.

Ensures the coupon reaches startGuidancePackageCheckout and that a
successful checkoutUrl is RETURNED to the client (never redirect() to
an external Zibal URL from this server action). Rerun-safe.
"""

from __future__ import annotations

from pathlib import Path
import sys

RETURN_MARKER = "GUIDANCE_CHECKOUT_RETURN_URL"


def ensure_discount_code(text: str) -> str:
    if "startGuidancePackageCheckout(" not in text:
        return text
    if "discountCode:" in text:
        return text
    return text.replace(
        "startGuidancePackageCheckout({",
        'startGuidancePackageCheckout({\n    discountCode: String(formData.get("discountCode") ?? "").trim(),',
        1,
    )


def replace_gateway_redirect(text: str) -> str:
    if RETURN_MARKER in text:
        return text
    replacements = (
        'redirect(started.checkoutUrl);',
        'redirect(result.checkoutUrl);',
        'redirect(started.checkoutUrl)',
        'redirect(result.checkoutUrl)',
    )
    for needle in replacements:
        if needle in text:
            var_name = "started" if "started." in needle else "result"
            text = text.replace(
                needle,
                (
                    f"/* {RETURN_MARKER} */\n"
                    f"    return {{\n"
                    f"      checkoutUrl: {var_name}.checkoutUrl,\n"
                    f"      paymentIntentId: {var_name}.paymentIntentId,\n"
                    f"    }};"
                ),
                1,
            )
            return text
    return text


def patch(path: Path) -> str:
    text = path.read_text(encoding="utf-8")
    if "startGuidancePackageCheckout" not in text:
        return "no-checkout-fn"
    text = ensure_discount_code(text)
    text = replace_gateway_redirect(text)
    path.write_text(text, encoding="utf-8", newline="\n")
    return "patched"


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: patch_step10_checkout.py <step10.ts>", file=sys.stderr)
        return 2
    path = Path(sys.argv[1])
    if not path.exists():
        print("missing")
        return 0
    print(patch(path))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
