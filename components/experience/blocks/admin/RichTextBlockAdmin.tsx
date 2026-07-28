"use client";

import { BlockAdminNotYetImplemented } from "@/components/experience/blocks/admin/BlockAdminNotYetImplemented";
import type { RichTextBlockConfig } from "@/lib/experience/blocks/rich-text";
import type { ExperienceAdminBlockEditor } from "@/lib/experience/definition-types";

export const RichTextBlockAdmin: ExperienceAdminBlockEditor<RichTextBlockConfig> = (
  props,
) => <BlockAdminNotYetImplemented {...props} />;
