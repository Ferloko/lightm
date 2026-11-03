import { useEffect, useState, type ReactNode } from "react";
import ComingSoonPage from "./ComingSoonPage";
import { comingSoonEventName, getComingSoonPage, type ComingSoonPage as ComingSoonConfig } from "@/lib/pageAvailability";

export default function ComingSoonGate({ path, children }: { path: string; children: ReactNode }) {
  const [page, setPage] = useState<ComingSoonConfig | undefined>(() => getComingSoonPage(path));
  useEffect(() => { const refresh = () => setPage(getComingSoonPage(path)); window.addEventListener(comingSoonEventName(), refresh); window.addEventListener("storage", refresh); return () => { window.removeEventListener(comingSoonEventName(), refresh); window.removeEventListener("storage", refresh); }; }, [path]);
  return page?.enabled ? <div className="site-shell coming-soon-shell"><header className="site-header"><div className="brand-row"><LinkBack /></div></header><ComingSoonPage page={page} /></div> : <>{children}</>;
}
function LinkBack() { return <a className="wordmark" href="/" aria-label="LIGHT inicio">LIGHT</a>; }
