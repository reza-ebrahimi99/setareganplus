"use client";

import { BlockAdminNotYetImplemented } from "@/components/experience/blocks/admin/BlockAdminNotYetImplemented";
import type { CountdownBlockConfig } from "@/lib/experience/blocks/countdown";
import type { ExperienceAdminBlockEditor } from "@/lib/experience/definition-types";

export const CountdownBlockAdmin: ExperienceAdminBlockEditor<CountdownBlockConfig> =
  (props) => <BlockAdminNotYetImplemented {...props} />;
