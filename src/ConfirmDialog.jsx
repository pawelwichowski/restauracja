export default function ConfirmDialog({ title, message, confirmLabel, busy, onCancel, onConfirm }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
        <h2 id="confirm-title">{title}</h2>
        <p>{message}</p>
        <div className="confirm-actions">
          <button className="secondary-button" type="button" onClick={onCancel} disabled={busy}>
            Anuluj
          </button>
          <button className="danger-button" type="button" onClick={onConfirm} disabled={busy}>
            {busy ? "Usuwanie…" : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
