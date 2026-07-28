"use client";

import { BlockAdminNotYetImplemented } from "@/components/experience/blocks/admin/BlockAdminNotYetImplemented";
import type { ImageBlockConfig } from "@/lib/experience/blocks/image";
import type { ExperienceAdminBlockEditor } from "@/lib/experience/definition-types";

export const ImageBlockAdmin: ExperienceAdminBlockEditor<ImageBlockConfig> = (
  props,
) => <BlockAdminNotYetImplemented {...props} />;
