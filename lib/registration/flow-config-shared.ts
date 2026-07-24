/**
 * @deprecated Import from `@/lib/registration/flow-config` instead.
 * Kept as a thin re-export for transitional imports.
 */
export type {
  RegistrationFlowConfig,
  RegistrationFlowPackagePricing,
  RegistrationFlowPublicView,
  RegistrationFlowRowLike,
  RegistrationFlowSettings,
  RegistrationFlowSnapshot,
} from "@/lib/registration/flow-config";

export {
  hydrateRegistrationFlow,
  isDiscountWindowActive,
  isRegistrationWindowOpen,
  parseAdminSmsRecipients,
  parseRegistrationFlowSettings,
  remainingCapacity,
  serializeRegistrationFlow,
  toRegistrationFlowPublicView,
} from "@/lib/registration/flow-config";
