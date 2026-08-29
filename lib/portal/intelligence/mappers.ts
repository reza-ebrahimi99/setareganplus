/**
 * Presentation mappers — PortalWidgetModel ↔ existing UI props.
 * Keeps Phases 0–4 components stable while standardizing the contract.
 */

import type { PortalWidgetProps } from "@/components/portal/PortalWidget";
import type { PortalWidgetModel } from "@/lib/portal/intelligence/types";

export function portalWidgetModelToProps(
  model: PortalWidgetModel,
): Pick<
  PortalWidgetProps,
  | "id"
  | "title"
  | "description"
  | "action"
  | "empty"
  | "emptyTitle"
  | "emptyDescription"
  | "module"
  | "accent"
  | "icon"
> {
  const action = model.actions?.[0];
  return {
    id: model.id,
    title: model.title,
    description: model.description,
    action: action ? { href: action.href, label: action.label } : undefined,
    empty: model.empty,
    emptyTitle: model.emptyTitle,
    emptyDescription: model.emptyDescription,
    module: model.module,
    accent: model.accent,
    icon: model.icon,
  };
}

export const IntelligenceMappers = {
  portalWidgetModelToProps,
} as const;
