"use client";

import { BlockAdminNotYetImplemented } from "@/components/experience/blocks/admin/BlockAdminNotYetImplemented";
import type { SpacerBlockConfig } from "@/lib/experience/blocks/spacer";
import type { ExperienceAdminBlockEditor } from "@/lib/experience/definition-types";

export const SpacerBlockAdmin: ExperienceAdminBlockEditor<SpacerBlockConfig> = (
  props,
) => <BlockAdminNotYetImplemented {...props} />;
