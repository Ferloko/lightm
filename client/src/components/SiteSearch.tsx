import { ArrowUpRight, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { editorialUsers, setSession, TEMPORARY_PASSWORD, type EditorialUser } from "@/lib/editorial";
import { supabase } from "@/lib/supabase";

const searchable = [
  ["Vestirse de futuro", "/historias/vestirse-de-futuro", "Moda"],
  ["Runway", "/runway", "Pasarelas y marcas"],
  ["Archivo", "/archivo", "Historias MODA"],
  ["Belleza", "/belleza", "Cuidado y belleza"],
  ["Cultura", "/cultura", "Ideas y espacios"],
  ["Sociedad", "/sociedad", "Voces y personas"],
  ["Newsletter", "/newsletter", "Correspondencia MODA"],
] as const;

export default function SiteSearch({ onClose }: { onClose?: () => void }) {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [candidate, setCandidate] = useState<EditorialUser | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const results = useMemo(() => searchable.filter(([title, , meta]) => `${title} ${meta}`.toLowerCase().includes(query.trim().toLowerCase())), [query]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const user = editorialUsers[query.trim().toLowerCase()];
    if (user) { setCandidate(user); setPasswordOpen(true); setError(""); return; }
    if (query.trim() && results.length === 1) { navigate(results[0][1]); onClose?.(); }
  };

  const unlock = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase && password !== TEMPORARY_PASSWORD) { setError("Contraseña temporal incorrecta."); return; }
    if (candidate && supabase) {
      const { error: authError } = await supabase.auth.signInWithPassword({ email: candidate.email, password });
      if (authError) { setError("Este perfil todavía no existe en Supabase Auth. Créalo con el correo indicado en EDITORIAL-CMS.md."); return; }
    }
    if (candidate) { setSession(candidate); setPasswordOpen(false); onClose?.(); navigate("/admin"); }
  };

  return <div className="search-panel" role="dialog" aria-modal="true" aria-label="Buscar en MODA">
    <div className="search-panel__bar"><span className="search-panel__edition">MODA / BUSCAR</span><button className="close-button" type="button" onClick={onClose} aria-label="Cerrar búsqueda"><X size={22} /></button></div>
    <div className="search-panel__inner">
      <form onSubmit={submit} className="search-panel__form"><Search size={24} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar historias, marcas, palabras clave..." aria-label="Buscar" /><span>Enter ↵</span></form>
      <div className="search-results">{results.map(([title, href, meta]) => <Link href={href} key={href} onClick={onClose}><span>{meta}</span><strong>{title}</strong><ArrowUpRight size={20} /></Link>)}{query.trim() && results.length === 0 && !editorialUsers[query.trim().toLowerCase()] && <p className="search-empty">No encontramos resultados. Prueba con otra palabra.</p>}</div>
    </div>
    {passwordOpen && <div className="secret-modal"><div className="secret-modal__card"><p className="eyebrow">Acceso editorial / {candidate?.role}</p><h2>Identidad confirmada.</h2><p>Introduce la contraseña temporal para abrir el dashboard de MODA.</p><form onSubmit={unlock}><label htmlFor="secret-password">Contraseña</label><input id="secret-password" type="password" autoFocus value={password} onChange={(event) => setPassword(event.target.value)} /><button type="submit">Entrar <ArrowUpRight size={17} /></button>{error && <small>{error}</small>}</form><button type="button" className="secret-modal__cancel" onClick={() => setPasswordOpen(false)}>Cancelar</button></div></div>}
  </div>;
}
