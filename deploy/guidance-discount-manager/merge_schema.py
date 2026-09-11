#!/usr/bin/env python3
"""Idempotent Prisma merge for GuidanceDiscountCode."""

from __future__ import annotations

from pathlib import Path
import sys

ORG_REL = "  guidanceDiscountCodes                GuidanceDiscountCode[]"
MODEL_ANCHOR = '  @@map("guidance_choice_feedback")\n}'


def main() -> int:
    schema = Path(sys.argv[1] if len(sys.argv) > 1 else "prisma/schema.prisma")
    fragment = Path(sys.argv[2])
    text = schema.read_text(encoding="utf-8")
    model = fragment.read_text(encoding="utf-8").strip()

    if "guidanceDiscountCodes" not in text:
        needle = "  guidanceChoiceFeedback               GuidanceChoiceFeedback[]\n"
        if needle not in text:
            print("organization relation anchor missing", file=sys.stderr)
            return 1
        text = text.replace(needle, needle + ORG_REL + "\n", 1)

    if "model GuidanceDiscountCode" not in text:
        if MODEL_ANCHOR not in text:
            print("model anchor missing", file=sys.stderr)
            return 1
        text = text.replace(MODEL_ANCHOR, MODEL_ANCHOR + "\n\n" + model + "\n", 1)

    schema.write_text(text, encoding="utf-8", newline="\n")
    print("merged")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
