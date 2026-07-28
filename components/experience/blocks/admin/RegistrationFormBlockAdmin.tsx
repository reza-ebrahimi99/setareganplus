"use client";

import { BlockAdminNotYetImplemented } from "@/components/experience/blocks/admin/BlockAdminNotYetImplemented";
import type { RegistrationFormBlockConfig } from "@/lib/experience/blocks/registration-form";
import type { ExperienceAdminBlockEditor } from "@/lib/experience/definition-types";

export const RegistrationFormBlockAdmin: ExperienceAdminBlockEditor<RegistrationFormBlockConfig> =
  (props) => <BlockAdminNotYetImplemented {...props} />;
