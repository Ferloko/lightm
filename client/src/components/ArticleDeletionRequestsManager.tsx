import { useCallback, useEffect, useState } from "react";
import { Check, Clock3, RefreshCw, ShieldAlert, Trash2, X } from "lucide-react";
import { fetchArticleDeletionRequests, resolveArticleDeletionRequest, type ArticleDeletionRequest } from "@/lib/articleDeletion";

type Props = { onArticleDeleted: (articleId: string) => void; canResolve?: boolean };

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ArticleDeletionRequestsManager({ onArticleDeleted, canResolve = true }: Props) {
  const [requests, setRequests] = useState<ArticleDeletionRequest[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true); setNotice("");
    try { setRequests(await fetchArticleDeletionRequests()); }
    catch (error) { setNotice(`No se pudieron cargar las solicitudes: ${error instanceof Error ? error.message : "error desconocido"}`); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  const resolve = async (request: ArticleDeletionRequest, approve: boolean) => {
    const note = notes[request.id]?.trim() || "";
    if (note.length < 5) { setNotice("Añade un comentario de al menos 5 caracteres para resolver la solicitud."); return; }
    if (approve && !window.confirm(`¿Autorizar y borrar “${request.articleTitle}”? La solicitud se conservará en el historial.`)) return;
    setBusyId(request.id); setNotice("");
    try {
      await resolveArticleDeletionRequest(request.id, note, approve);
      const status = approve ? "approved" : "rejected";
      setRequests((current) => current.map((item) => item.id === request.id ? { ...item, status, resolutionNote: note, resolvedAt: new Date().toISOString(), articleId: item.articleId } : item));
      if (approve && request.articleId) onArticleDeleted(request.articleId);
      setNotice(approve ? "Solicitud autorizada y artículo borrado. El comentario quedó en el historial." : "Solicitud rechazada; el artículo sigue guardado.");
    } catch (error) {
      setNotice(`No se pudo resolver la solicitud: ${error instanceof Error ? error.message : "error desconocido"}`);
    } finally { setBusyId(""); }
  };

  const pendingCount = requests.filter((request) => request.status === "pending").length;
  return <section className="article-deletion-manager">
    <div className="admin-section-heading"><div><p>LIGHT / Control editorial</p><h2>Solicitudes de borrado.</h2></div><div className="admin-section-heading__actions"><span className="admin-section-count">{pendingCount} pendientes</span><button className="admin-secondary" type="button" onClick={() => void refresh()} disabled={loading}><RefreshCw size={14} /> Actualizar</button></div></div>
    <p className="article-deletion-manager__intro">Las solicitudes aprobadas eliminan el borrador y conservan el motivo y el comentario de autorización. Las decisiones quedan registradas.</p>
    {notice && <p className="article-deletion-manager__notice" role="status">{notice}</p>}
    {loading ? <div className="admin-empty"><Clock3 size={22} /><p>Consultando solicitudes…</p></div> : requests.length ? <div className="article-deletion-list">{requests.map((request) => <article className="article-deletion-card" key={request.id}>
      <div className="article-deletion-card__head"><div><p className="eyebrow">{request.requesterName} · {formatDate(request.createdAt)}</p><h3>{request.articleTitle}</h3>{request.articleSlug && <small>/historias/{request.articleSlug}</small>}</div><span className={`article-deletion-status article-deletion-status--${request.status}`}>{request.status === "pending" ? "Pendiente" : request.status === "approved" ? "Borrado autorizado" : "Rechazada"}</span></div>
      <div className="article-deletion-card__notes"><div><span>Motivo de Staff Writer</span><p>{request.requestNote}</p></div>{request.resolutionNote && <div><span>Comentario Owner/Admin</span><p>{request.resolutionNote}</p></div>}</div>
      {request.status === "pending" && canResolve && <div className="article-deletion-card__resolve"><label htmlFor={`resolution-${request.id}`}>Comentario de resolución <textarea id={`resolution-${request.id}`} value={notes[request.id] || ""} onChange={(event) => setNotes((current) => ({ ...current, [request.id]: event.target.value }))} rows={3} maxLength={1000} placeholder="Deja constancia del motivo de la decisión…" /></label><div><button className="admin-secondary" type="button" disabled={busyId === request.id} onClick={() => void resolve(request, false)}><X size={14} /> Rechazar</button><button className="admin-primary article-deletion-card__approve" type="button" disabled={busyId === request.id || (notes[request.id]?.trim().length || 0) < 5} onClick={() => void resolve(request, true)}>{busyId === request.id ? <RefreshCw size={14} className="spin" /> : <Trash2 size={14} />} Autorizar y borrar</button></div></div>}
      {request.status !== "pending" && request.resolvedAt && <p className="article-deletion-card__resolved"><Check size={14} /> Resuelta el {formatDate(request.resolvedAt)}</p>}
    </article>)}</div> : <div className="admin-empty"><ShieldAlert size={24} /><p className="eyebrow">Sin solicitudes pendientes</p><h2>Todo está al día.</h2></div>}
  </section>;
}
