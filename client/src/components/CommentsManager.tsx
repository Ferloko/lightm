import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteContactSubmission, fetchContactSubmissions, contactSubmissionsUpdatedEvent, type ContactSubmission } from "@/lib/contactSubmissions";
import { describeError, subscribeToTable } from "@/lib/supabase";

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" });
}

export default function CommentsManager({ canDelete = false }: { canDelete?: boolean }) {
  const [comments, setComments] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try { setComments(await fetchContactSubmissions()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudieron cargar los comentarios."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void refresh();
    window.addEventListener(contactSubmissionsUpdatedEvent, refresh);
    const unsubscribe = subscribeToTable("contact_submissions", () => { void refresh(); });
    return () => { window.removeEventListener(contactSubmissionsUpdatedEvent, refresh); unsubscribe(); };
  }, [refresh]);

  return <section className="comments-manager">
    <div className="admin-section-heading"><div><p>LIGHT / Business</p><h2>Comentarios recibidos.</h2></div><div className="admin-section-heading__actions"><button className="admin-secondary" type="button" onClick={() => void refresh()} disabled={loading}>{loading ? "Actualizando…" : "Actualizar"}</button></div></div>
    <p className="comments-manager__intro">Propuestas y mensajes enviados desde el formulario de Business, ordenados del más reciente al más antiguo.</p>
    {error && <p className="comments-manager__error" role="alert">No se pudieron cargar los comentarios: {error}. Si usas Supabase, aplica la migración de `contact_submissions`.</p>}
    {loading ? <p className="comments-manager__empty">Cargando comentarios…</p> : comments.length === 0 ? <div className="comments-manager__empty"><p className="eyebrow">Bandeja vacía</p><h3>Aún no hay comentarios.</h3><p>Cuando alguien envíe el formulario de Business, aparecerá aquí.</p></div> : <div className="comments-manager__list">{comments.map((item) => <article className="comments-manager__card" key={item.id}>
      <div className="comments-manager__card-head"><div><h3>{item.firstName} {item.lastName}</h3><a href={`mailto:${item.email}`}>{item.email}</a></div><div className="comments-manager__meta"><time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>{canDelete && <button type="button" className="admin-icon-button admin-icon-button--delete" aria-label={`Eliminar el comentario de ${item.firstName}`} onClick={() => { if (!window.confirm("¿Eliminar este comentario?")) return; void deleteContactSubmission(item.id).then(() => setComments((current) => current.filter((comment) => comment.id !== item.id))).catch((cause) => setError(describeError(cause))); }}><Trash2 size={14} /></button>}</div></div>
      <p>{item.comment}</p>
    </article>)}</div>}
  </section>;
}
