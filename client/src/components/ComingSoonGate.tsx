import { useEffect, useState, type ReactNode } from "react";
import { EyeOff } from "lucide-react";
import ComingSoonPage from "./ComingSoonPage";
import { comingSoonEventName, fetchRemoteComingSoonPages, getComingSoonPage, type ComingSoonPage as ComingSoonConfig } from "@/lib/pageAvailability";
import { getEditorialUser } from "@/lib/editorial";
import { subscribeToTable, supabase } from "@/lib/supabase";

/**
 * Closes a section for the public when "Próximamente" is on. The state comes from
 * Supabase (shared by everyone); people with an editorial session can still open the
 * page to keep working on it and see a banner telling them it is closed to the public.
 */
export default function ComingSoonGate({ path, children }: { path: string; children: ReactNode }) {
  const [page, setPage] = useState<ComingSoonConfig | undefined>(() => getComingSoonPage(path));
  const [isEditor, setIsEditor] = useState(false);
  const [loaded, setLoaded] = useState(!supabase);
  useEffect(() => {
    let active = true;
    const refresh = () => { void fetchRemoteComingSoonPages().then((pages) => { if (active) { setPage(pages.find((item) => item.path === path)); setLoaded(true); } }); };
    refresh();
    void getEditorialUser().then((user) => { if (active) setIsEditor(Boolean(user)); }).catch(() => undefined);
    window.addEventListener(comingSoonEventName(), refresh);
    const unsubscribe = subscribeToTable("page_availability", refresh);
    return () => { active = false; window.removeEventListener(comingSoonEventName(), refresh); unsubscribe(); };
  }, [path]);
  if (!loaded) return <div className="site-shell coming-soon-loading" aria-busy="true" />; // avoid flashing closed content
  if (!page?.enabled) return <>{children}</>;
  if (isEditor) return <><div className="coming-soon-editor-banner" role="status"><EyeOff size={14} /> <span><strong>{page.label}</strong> está cerrada al público (Próximamente). La ves porque tienes sesión editorial.</span></div>{children}</>;
  return <div className="site-shell coming-soon-shell"><header className="site-header"><div className="brand-row"><a className="wordmark" href="/" aria-label="LIGHT inicio">LIGHT</a></div></header><ComingSoonPage page={page} /></div>;
}
