import { getRegistrationCatalog } from "@/lib/registration/catalog-registry";
import { getDbRegistrationCatalog } from "@/lib/registration/flows/public";
import type {
  RegistrationFlowCatalog,
  RegistrationFlowKey,
} from "@/lib/registration/types";

/**
 * Resolve catalog from code registry first, then DB-managed RegistrationFlow.
 * Keeps hardcoded flows (e.g. qalamchi-exam) working while enabling CMS flows.
 */
export async function resolveRegistrationCatalog(
  flowKey: RegistrationFlowKey | string,
): Promise<RegistrationFlowCatalog | null> {
  const coded = getRegistrationCatalog(flowKey);
  if (coded) return coded;
  return getDbRegistrationCatalog(flowKey);
}
