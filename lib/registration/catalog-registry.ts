import { qalamchiExamCatalog } from "@/lib/registration/catalogs/qalamchi-exam";
import type {
  RegistrationFlowCatalog,
  RegistrationFlowKey,
} from "@/lib/registration/types";

const CATALOGS: Record<string, RegistrationFlowCatalog> = {
  [qalamchiExamCatalog.flowKey]: qalamchiExamCatalog,
};

export function getRegistrationCatalog(
  flowKey: RegistrationFlowKey,
): RegistrationFlowCatalog | null {
  return CATALOGS[flowKey] ?? null;
}

export function listRegistrationCatalogs(): RegistrationFlowCatalog[] {
  return Object.values(CATALOGS);
}
