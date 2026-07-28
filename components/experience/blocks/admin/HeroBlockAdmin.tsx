"use client";

import { BlockAdminNotYetImplemented } from "@/components/experience/blocks/admin/BlockAdminNotYetImplemented";
import type { HeroBlockConfig } from "@/lib/experience/blocks/hero";
import type { ExperienceAdminBlockEditor } from "@/lib/experience/definition-types";

export const HeroBlockAdmin: ExperienceAdminBlockEditor<HeroBlockConfig> = (
  props,
) => <BlockAdminNotYetImplemented {...props} />;
