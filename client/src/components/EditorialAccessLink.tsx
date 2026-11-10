import { LayoutDashboard } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { getEditorialUser } from "@/lib/editorial";
import { supabase } from "@/lib/supabase";

export const EDITORIAL_AUTH_EVENT = "light:editorial-auth-change";

// One lookup shared by every header on the page; reset whenever the session changes.
let cached: Promise<boolean> | null = null;
function hasEditorialAccess() { cached ??= getEditorialUser().then((user) => Boolean(user)).catch(() => false); return cached; }
export function resetEditorialAccess() { cached = null; window.dispatchEvent(new Event(EDITORIAL_AUTH_EVENT)); }

/** Shortcut to the dashboard, shown next to "Buscar" only while an editorial session is active. */
export default function EditorialAccessLink() {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    let active = true;
    const check = () => { void hasEditorialAccess().then((value) => { if (active) setAllowed(value); }); };
    const refresh = () => { cached = null; check(); };
    check();
    window.addEventListener(EDITORIAL_AUTH_EVENT, check);
    // Demo sessions live in localStorage: another tab signing in or out updates this one too.
    const onStorage = (event: StorageEvent) => { if (event.key === "light.demo.editorial-auth") refresh(); };
    window.addEventListener("storage", onStorage);
    const subscription = supabase?.auth.onAuthStateChange((event) => { if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") refresh(); });
    return () => { active = false; window.removeEventListener(EDITORIAL_AUTH_EVENT, check); window.removeEventListener("storage", onStorage); subscription?.data.subscription.unsubscribe(); };
  }, []);
  if (!allowed) return null;
  return <Link className="header-action header-action--studio" href="/admin" title="Abrir el estudio editorial" aria-label="Abrir el estudio editorial"><LayoutDashboard size={17} strokeWidth={1.4} /><span>Estudio</span></Link>;
}
