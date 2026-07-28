"use client";

import { BlockAdminNotYetImplemented } from "@/components/experience/blocks/admin/BlockAdminNotYetImplemented";
import type { PricingBlockConfig } from "@/lib/experience/blocks/pricing";
import type { ExperienceAdminBlockEditor } from "@/lib/experience/definition-types";

export const PricingBlockAdmin: ExperienceAdminBlockEditor<PricingBlockConfig> = (
  props,
) => <BlockAdminNotYetImplemented {...props} />;
