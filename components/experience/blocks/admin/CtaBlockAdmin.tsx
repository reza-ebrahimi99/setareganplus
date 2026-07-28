"use client";

import { BlockAdminNotYetImplemented } from "@/components/experience/blocks/admin/BlockAdminNotYetImplemented";
import type { CtaBlockConfig } from "@/lib/experience/blocks/cta";
import type { ExperienceAdminBlockEditor } from "@/lib/experience/definition-types";

export const CtaBlockAdmin: ExperienceAdminBlockEditor<CtaBlockConfig> = (props) => (
  <BlockAdminNotYetImplemented {...props} />
);
