"use client";

export function ChoiceConfirmDialog(props: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!props.open) return null;
  return (
    <div className="gcs-modal" role="dialog" aria-modal="true" aria-labelledby="gcs-modal-title">
      <div className="gcs-modal__card">
        <h3 id="gcs-modal-title">{props.title}</h3>
        <p>{props.body}</p>
        <div className="gcs-modal__actions">
          <button type="button" className="gcs-btn gcs-btn--ghost" onClick={props.onCancel}>
            انصراف
          </button>
          <button
            type="button"
            className="gcs-btn gcs-btn--primary"
            onClick={props.onConfirm}
            disabled={props.pending}
          >
            {props.pending ? "در حال انجام…" : props.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
