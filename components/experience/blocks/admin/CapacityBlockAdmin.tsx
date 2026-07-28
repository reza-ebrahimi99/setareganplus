"use client";

import { BlockAdminNotYetImplemented } from "@/components/experience/blocks/admin/BlockAdminNotYetImplemented";
import type { CapacityBlockConfig } from "@/lib/experience/blocks/capacity";
import type { ExperienceAdminBlockEditor } from "@/lib/experience/definition-types";

export const CapacityBlockAdmin: ExperienceAdminBlockEditor<CapacityBlockConfig> =
  (props) => <BlockAdminNotYetImplemented {...props} />;
