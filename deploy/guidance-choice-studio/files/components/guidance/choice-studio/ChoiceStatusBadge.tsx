import {
  labelChoiceStudioState,
  resolveChoiceStudioState,
} from "@/lib/guidance/choice-studio/status";

export function ChoiceStatusBadge(props: {
  kind?: string | null;
  status?: string | null;
  hasItems?: boolean;
  sanjeshStatus?: string | null;
}) {
  const state = resolveChoiceStudioState(props);
  return (
    <span className={`gcs-badge gcs-badge--${state.toLowerCase()}`} data-state={state}>
      {labelChoiceStudioState(state)}
    </span>
  );
}
