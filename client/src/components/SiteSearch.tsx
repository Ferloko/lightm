import { ArrowUpRight, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { getEditorialUser } from "@/lib/editorial";
import { isDemoMode, supabase } from "@/lib/supabase";

const searchable = [
  ["Vestirse de futuro", "/historias/vestirse-de-futuro", "Moda"],
  ["Moda", "/moda", "Sección editorial"],
  ["Runway", "/runway", "Pasarelas y marcas"],
  ["Masthead", "/masthead", "Equipo editorial LIGHT"],
  ["Business", "/business", "Colaboraciones y oportunidades"],
  ["Archivo", "/archivo", "Historias LIGHT"],
  ["La revista", "/sobre-moda", "Ediciones LIGHT"],
  ["About Us", "/about", "Quiénes somos"],
  ["Belleza", "/belleza", "Cuidado y belleza"],
  ["Eventos", "/eventos", "Crónicas y encuentros"],
  ["Sociedad", "/sociedad", "Voces y personas"],
  ["Newsletter", "/newsletter", "Correspondencia LIGHT"],
] as const;

// Fallback for databases without the 20261110 migration. With it, the access word of
// each account is managed from Dashboard → Equipo and resolved by editorial_login_email().
const legacyAccessEmails: Record<string, string> = {
  snow: "snow@light.studio",
  songbird: "songbird@light.studio",
  moonglow: "moonglow@light.studio",
  bianca: "bianca@light.studio",
};

async function resolveAccessEmail(word: string): Promise<string | null> {
  const normalized = word.trim().toLowerCase();
  if (!normalized || normalized.includes(" ") || normalized.length > 40) return null;
  if (supabase) {
    const { data, error } = await supabase.rpc("editorial_login_email", { p_alias: normalized });
    if (!error) return typeof data === "string" && data ? data : null;
  }
  if (!supabase && !isDemoMode) return null;
  return legacyAccessEmails[normalized] || null;
}

export default function SiteSearch({ onClose }: { onClose?: () => void }) {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [accessName, setAccessName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const results = useMemo(() => searchable.filter(([title, , meta]) => `${title} ${meta}`.toLowerCase().includes(query.trim().toLowerCase())), [query]);

  const [checkingAccess, setCheckingAccess] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = query.trim().toLowerCase();
    if (results.length === 0 && normalized && !checkingAccess) {
      setCheckingAccess(true);
      const accessEmail = await resolveAccessEmail(normalized).catch(() => null);
      setCheckingAccess(false);
      if (accessEmail) {
        setEmail(accessEmail);
        setAccessName(normalized);
        setPassword("");
        setLoginOpen(true);
        setError("");
        return;
      }
    }
    if (query.trim() && results.length === 1) { navigate(results[0][1]); onClose?.(); }
  };

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!supabase) {
      if (!isDemoMode) { setError("El acceso editorial no está configurado en este sitio."); return; }
      if (password.trim().length < 4) { setError("En preview demo, usa una contraseña de al menos 4 caracteres."); return; }
      localStorage.setItem("light.demo.editorial-auth", "1");
      setLoginOpen(false);
      setPassword("");
      onClose?.();
      navigate("/admin");
      return;
    }
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (authError) { setError("Correo o contraseña incorrectos."); return; }
    const profile = await getEditorialUser();
    if (!profile) {
      await supabase.auth.signOut();
      setError("Tu usuario no tiene un perfil editorial activo. Pide acceso a un Owner.");
      return;
    }
    setLoginOpen(false);
    setPassword("");
    onClose?.();
    navigate("/admin");
  };

  return <div className="search-panel" role="dialog" aria-modal="true" aria-label="Buscar en LIGHT">
    <div className="search-panel__bar"><span className="search-panel__edition">LIGHT / BUSCAR</span><button className="close-button" type="button" onClick={onClose} aria-label="Cerrar búsqueda"><X size={22} /></button></div>
    <div className="search-panel__inner">
      <form onSubmit={(event) => void submit(event)} className="search-panel__form"><Search size={24} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar historias, marcas, palabras clave..." aria-label="Buscar" /><span>Enter ↵</span></form>
      <div className="search-results">{results.map(([title, href, meta]) => <Link href={href} key={`${href}-${title}`} onClick={onClose}><span>{meta}</span><strong>{title}</strong><ArrowUpRight size={20} /></Link>)}{query.trim() && results.length === 0 && !checkingAccess && <p className="search-empty">No encontramos resultados. Prueba con otra palabra.</p>}</div>
    </div>
    {loginOpen && <div className="secret-modal"><div className="secret-modal__card"><p className="eyebrow">Acceso editorial / {accessName}</p><h2>Entrar al dashboard.</h2><p>Introduce la contraseña de tu usuario editorial.</p><form onSubmit={login}><label htmlFor="editorial-password">Contraseña</label><input id="editorial-password" type="password" autoFocus value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /><button type="submit">Entrar <ArrowUpRight size={17} /></button>{error && <small>{error}</small>}</form><button type="button" className="secret-modal__cancel" onClick={() => setLoginOpen(false)}>Cancelar</button></div></div>}
  </div>;
}
