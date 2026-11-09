import { useState, type FormEvent } from "react";
import { LoaderCircle, Send, X } from "lucide-react";
import type { EditorialArticle } from "@/lib/editorial";
import { submitArticleDeletionRequest, type ArticleDeletionRequest } from "@/lib/articleDeletion";

type Props = {
  article: EditorialArticle;
  onClose: () => void;
  onSubmitted: (request: ArticleDeletionRequest) => void;
};

export default function ArticleDeletionRequestDialog({ article, onClose, onSubmitted }: Props) {
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (note.trim().length < 5) { setError("Explica brevemente el motivo (mínimo 5 caracteres)."); return; }
    setSaving(true); setError("");
    try { onSubmitted(await submitArticleDeletionRequest(article, note)); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudo enviar la solicitud."); }
    finally { setSaving(false); }
  };

  return <div className="article-delete-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
    <section className="article-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="article-delete-dialog-title">
      <button className="article-delete-dialog__close" type="button" onClick={onClose} disabled={saving} aria-label="Cerrar"><X size={18} /></button>
      <p className="eyebrow">LIGHT / Solicitud editorial</p>
      <h2 id="article-delete-dialog-title">Solicitar borrado.</h2>
      <p className="article-delete-dialog__summary">“{article.title || "Sin título"}” seguirá guardado hasta que Owner/Admin revise la solicitud.</p>
      <form onSubmit={(event) => void submit(event)}>
        <label htmlFor="article-delete-request-note">Motivo de la solicitud</label>
        <textarea id="article-delete-request-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} rows={5} required placeholder="Cuéntanos por qué debería retirarse este borrador…" />
        <small>{note.length}/1000 · mínimo 5 caracteres</small>
        {error && <p className="article-delete-dialog__error" role="alert">{error}</p>}
        <div className="article-delete-dialog__actions"><button className="admin-secondary" type="button" onClick={onClose} disabled={saving}>Cancelar</button><button className="admin-primary" type="submit" disabled={saving || note.trim().length < 5}>{saving ? <LoaderCircle size={15} className="spin" /> : <Send size={15} />} Enviar solicitud</button></div>
      </form>
    </section>
  </div>;
}
