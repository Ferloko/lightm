import { useEffect, useRef, useState } from "react";
import { trackArticleEvent } from "@/lib/articleAnalytics";
import { Heart, Link2 } from "lucide-react";
import { fetchArticleLikeState, setArticleLiked, type ArticleLikeState } from "@/lib/articleLikes";

type Props = { articleKey: string };

async function copyCurrentUrl() {
  const url = window.location.href;
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url);
      return;
    } catch {
      // Try the compatible fallback below.
    }
  }
  const field = document.createElement("textarea");
  field.value = url;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  const copied = document.execCommand("copy");
  field.remove();
  if (!copied) throw new Error("El navegador no permitió copiar el enlace.");
}

export default function ArticleEngagement({ articleKey }: Props) {
  const [state, setState] = useState<ArticleLikeState>({ liked: false, count: 0 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const noticeTimer = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void fetchArticleLikeState(articleKey).then((next) => { if (active) setState(next); }).catch((error) => {
      if (active) setNotice(`No se pudieron cargar los likes: ${error instanceof Error ? error.message : "error desconocido"}`);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current); };
  }, [articleKey]);

  const showNotice = (message: string) => {
    setNotice(message);
    if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(""), 2600);
  };

  const toggleLike = async () => {
    if (busy || loading) return;
    const previous = state;
    const desired = !state.liked;
    setState({ liked: desired, count: Math.max(0, state.count + (desired ? 1 : -1)) });
    setBusy(true);
    try {
      setState(await setArticleLiked(articleKey, desired));
    } catch (error) {
      setState(previous);
      showNotice(`No se pudo guardar el like: ${error instanceof Error ? error.message : "error desconocido"}`);
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    try {
      await copyCurrentUrl();
      trackArticleEvent(articleKey, "share");
      showNotice("Enlace copiado!");
    } catch {
      showNotice("No se pudo copiar el enlace.");
    }
  };

  return <div className="article-engagement" aria-label="Acciones de la historia">
    <div className="article-engagement__controls">
      <button className={`article-engagement__like${state.liked ? " is-liked" : ""}`} type="button" onClick={() => void toggleLike()} disabled={busy || loading} aria-pressed={state.liked} aria-label={`${state.liked ? "Quitar me gusta" : "Me gusta"}; ${state.count} likes`}>
        <Heart size={17} strokeWidth={1.6} fill={state.liked ? "currentColor" : "none"} />
        <span>Me gusta</span>
        <b>{loading ? "…" : state.count}</b>
      </button>
      <div className="article-engagement__share-wrap">
        <button className="article-engagement__share" type="button" onClick={() => void share()}><Link2 size={16} strokeWidth={1.6} /> Compartir historia</button>
        {notice && <span className="article-engagement__toast" role="status" aria-live="polite">{notice}</span>}
      </div>
    </div>
  </div>;
}
