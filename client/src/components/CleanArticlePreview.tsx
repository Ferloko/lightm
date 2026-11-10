import { Menu, Search, X } from "lucide-react";
import { useEffect } from "react";
import PublicArticleView from "@/components/PublicArticleView";
import type { EditorialArticle } from "@/lib/editorial";

/** Clean preview: the published page itself (same component and same styles), not an approximation. */
export default function CleanArticlePreview({ article, onClose }: { article: EditorialArticle; onClose: () => void }) {
  useEffect(() => { const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { event.stopPropagation(); onClose(); } }; window.addEventListener("keydown", onKey, true); return () => window.removeEventListener("keydown", onKey, true); }, [onClose]);
  return <div className="clean-preview" role="dialog" aria-modal="true" aria-label="Vista previa limpia">
    <div className="clean-preview__bar">
      <span className="clean-preview__label"><i /> Vista previa · así se verá publicada</span>
      <button type="button" className="clean-preview__close" onClick={onClose} aria-label="Cerrar vista previa" title="Cerrar (Esc)"><X size={18} /> Volver al editor</button>
    </div>
    <div className="site-shell dynamic-article clean-preview__site" aria-hidden="true">
      <header className="site-header">
        <div className="topline"><span className="header-action header-action--menu"><Menu size={20} strokeWidth={1.4} /><span>Menú</span></span><p>Antes de que esté de moda, está en LIGHT</p><span className="header-action"><Search size={19} strokeWidth={1.4} /><span>Buscar</span></span></div>
        <div className="brand-row"><span className="wordmark">LIGHT</span></div>
        <nav className="main-nav"><span>Moda</span><span>Belleza</span><span>Eventos</span><span>Living</span><span>Runway</span><span>La revista</span></nav>
      </header>
      <PublicArticleView article={article} preview />
    </div>
  </div>;
}
