import type { PublicRegistrationFlow } from "@/lib/registration/flows/public";

/**
 * Runtime data for blocks with supportsBindings — never stored in block config JSON.
 */
export type ExperienceBindingContext = {
  flow: PublicRegistrationFlow;
  wizardPath: string;
  canStartRegistration: boolean;
  /** Confirmed registrations count for capacity blocks (from flow loader). */
  registrationCount: number;
};
