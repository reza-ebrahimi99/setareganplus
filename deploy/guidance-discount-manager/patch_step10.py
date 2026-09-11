#!/usr/bin/env python3
"""
Idempotent production Step 10 overlay.

DB-managed codes are resolved first. Existing preview/submit/legacy ENV
logic remains as fallback. Never replaces Zibal or PaymentIntent callbacks.

Rerun-safe: replaces the marked wrapper if an older overlay is present.
"""

from __future__ import annotations

from pathlib import Path
import sys

MARKER = "GUIDANCE_DB_DISCOUNT_RESOLVER"
START = "/* ===== GUIDANCE_DB_DISCOUNT_RESOLVER ===== */"
END = "/* ===== END GUIDANCE_DB_DISCOUNT_RESOLVER ===== */"

STUDENT_IMPORT = """import {
  previewManagedGuidanceDiscountForStudent,
} from "@/lib/guidance/discounts/student";"""

LEGACY_IMPORT = (
    'import { registerLegacyGuidanceDiscountLookup } from "@/lib/guidance/discounts/legacy";'
)

PACKAGES_IMPORT = """import {
  GUIDANCE_V2_PACKAGES,
  type GuidanceV2PackageCode,
} from "@/lib/guidance/journey-v2/steps/step10-packages";"""

PACKAGES_VALUE_IMPORT = """import {
  GUIDANCE_V2_PACKAGES,
} from "@/lib/guidance/journey-v2/steps/step10-packages";"""

WRAPPER = """
/* ===== GUIDANCE_DB_DISCOUNT_RESOLVER ===== */
registerLegacyGuidanceDiscountLookup(async (code, packageCode, _price) => {
  const result = await previewGuidanceV2Step10DiscountActionLegacy(packageCode, code);
  if (!result || typeof result !== "object" || !("ok" in result) || !result.ok) {
    return null;
  }
  const discountRials = Number(result.discountRials);
  if (!Number.isInteger(discountRials) || discountRials <= 0) return null;
  return { discountRials };
});

function isCanonicalGuidanceV2PackageCode(
  value: string,
): value is GuidanceV2PackageCode {
  return GUIDANCE_V2_PACKAGES.some((item) => item.code === value);
}

async function previewGuidanceV2Step10DiscountActionOverlay(
  packageCode: Parameters<typeof previewGuidanceV2Step10DiscountActionLegacy>[0],
  discountCode: string,
): Promise<Awaited<ReturnType<typeof previewGuidanceV2Step10DiscountActionLegacy>>> {
  const overlay = await previewManagedGuidanceDiscountForStudent(
    packageCode,
    discountCode,
  );
  if (overlay.resolved) {
    if (!overlay.result.ok) {
      return { ok: false, error: overlay.result.error };
    }
    const typedPackage = overlay.result.packageCode;
    if (!isCanonicalGuidanceV2PackageCode(typedPackage)) {
      return { ok: false, error: "بسته انتخاب‌شده معتبر نیست." };
    }
    return {
      ok: true,
      code: overlay.result.code,
      label: overlay.result.label,
      discountRials: overlay.result.discountRials,
      finalAmountRials: overlay.result.finalAmountRials,
      packageCode: typedPackage,
    };
  }
  return previewGuidanceV2Step10DiscountActionLegacy(packageCode, discountCode);
}
export { previewGuidanceV2Step10DiscountActionOverlay as previewGuidanceV2Step10DiscountAction };
/* ===== END GUIDANCE_DB_DISCOUNT_RESOLVER ===== */
"""


def ensure_imports(text: str) -> str:
    needed: list[str] = []
    if "@/lib/guidance/discounts/student" not in text:
        needed.append(STUDENT_IMPORT)
    if "@/lib/guidance/discounts/legacy" not in text:
        needed.append(LEGACY_IMPORT)
    if "GUIDANCE_V2_PACKAGES" not in text:
        if "GuidanceV2PackageCode" in text:
            needed.append(PACKAGES_VALUE_IMPORT)
        else:
            needed.append(PACKAGES_IMPORT)
    if not needed:
        return text
    lines = text.splitlines()
    last_import = max(
        (i for i, line in enumerate(lines) if line.startswith("import ")),
        default=-1,
    )
    lines.insert(last_import + 1, "\n".join(needed))
    text = "\n".join(lines)
    if not text.endswith("\n"):
        text += "\n"
    return text


def replace_wrapper(text: str) -> str:
    from_ = text.find(START)
    to = text.find(END)
    wrapper = WRAPPER.strip() + "\n"
    if from_ >= 0 and to > from_:
        return text[:from_] + wrapper + text[to + len(END) :].lstrip("\n")
    return text + ("\n" if not text.endswith("\n") else "") + wrapper


def patch(path: Path) -> str:
    text = path.read_text(encoding="utf-8")
    if "previewGuidanceV2Step10DiscountAction" not in text:
        return "no-preview-fn"

    text = ensure_imports(text)

    if "async function previewGuidanceV2Step10DiscountActionLegacy" not in text:
        text = text.replace(
            "export async function previewGuidanceV2Step10DiscountAction",
            "async function previewGuidanceV2Step10DiscountActionLegacy",
            1,
        )

    if "discountCode:" not in text and "startGuidancePackageCheckout(" in text:
        text = text.replace(
            "startGuidancePackageCheckout({",
            'startGuidancePackageCheckout({\n    discountCode: String(formData.get("discountCode") ?? ""),',
            1,
        )

    text = replace_wrapper(text)
    path.write_text(text, encoding="utf-8", newline="\n")
    return "patched"


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: patch_step10.py <step10.ts>", file=sys.stderr)
        return 2
    path = Path(sys.argv[1])
    if not path.exists():
        print("missing")
        return 0
    print(patch(path))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
