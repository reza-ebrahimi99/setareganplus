"use client";

import { BlockAdminNotYetImplemented } from "@/components/experience/blocks/admin/BlockAdminNotYetImplemented";
import type { FeaturesBlockConfig } from "@/lib/experience/blocks/features";
import type { ExperienceAdminBlockEditor } from "@/lib/experience/definition-types";

export const FeaturesBlockAdmin: ExperienceAdminBlockEditor<FeaturesBlockConfig> = (
  props,
) => <BlockAdminNotYetImplemented {...props} />;
