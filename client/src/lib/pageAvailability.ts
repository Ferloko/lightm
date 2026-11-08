import { supabase } from "./supabase";

export type ComingSoonPage = {
  path: string;
  label: string;
  enabled: boolean;
  title: string;
  message: string;
  image: string;
  updatedAt: string;
};

export const managedPages: Omit<ComingSoonPage, "updatedAt">[] = [
  { path: "/moda", label: "Moda", enabled: false, title: "Algo nuevo está tomando forma.", message: "Estamos preparando una nueva mirada sobre la moda. Vuelve pronto.", image: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1800&q=90" },
  { path: "/belleza", label: "Belleza", enabled: false, title: "La belleza pide una pausa.", message: "Estamos editando una nueva selección de historias, rituales y luz.", image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1800&q=90" },
  { path: "/eventos", label: "Eventos", enabled: false, title: "Ideas en proceso.", message: "Esta página está tomando forma. Pronto volveremos a abrir la conversación.", image: "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1800&q=90" },
  { path: "/living", label: "Living", enabled: false, title: "El próximo destino está cerca.", message: "Estamos preparando una nueva guía para vivir más despacio.", image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1800&q=90" },
  { path: "/runway", label: "Runway", enabled: false, title: "La pasarela se está montando.", message: "Estamos ordenando la próxima temporada, firma a firma.", image: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1800&q=90" },
  { path: "/archivo", label: "Archivo", enabled: false, title: "El archivo vuelve a abrir pronto.", message: "Estamos afinando cada página para que vuelva a mirarse con calma.", image: "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1800&q=90" },
  { path: "/sobre-moda", label: "La revista", enabled: false, title: "La revista está cambiando de página.", message: "Muy pronto podrás conocer la nueva edición de LIGHT.", image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1800&q=90" },
  { path: "/newsletter", label: "Newsletter", enabled: false, title: "Una carta en preparación.", message: "Estamos preparando la próxima correspondencia de LIGHT.", image: "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1800&q=90" },
];

const KEY = "light.page-availability";
const eventName = "light:page-availability-updated";
function defaults(): ComingSoonPage[] { const now = new Date().toISOString(); return managedPages.map((page) => ({ ...page, updatedAt: now })); }
export function getComingSoonPages(): ComingSoonPage[] { try { const saved = JSON.parse(localStorage.getItem(KEY) || "null") as ComingSoonPage[] | null; if (!saved?.length) return defaults(); const byPath = new Map(saved.map((page) => [page.path, page])); return defaults().map((page) => ({ ...page, ...byPath.get(page.path) })); } catch { return defaults(); } }
export function saveComingSoonPages(pages: ComingSoonPage[]) { localStorage.setItem(KEY, JSON.stringify(pages)); window.dispatchEvent(new CustomEvent(eventName)); }
export function getComingSoonPage(path: string) { return getComingSoonPages().find((page) => page.path === path); }
export function isComingSoon(path: string) { return getComingSoonPage(path)?.enabled === true; }
export function comingSoonEventName() { return eventName; }
export async function fetchRemoteComingSoonPages(): Promise<ComingSoonPage[]> {
  if (!supabase) return getComingSoonPages();
  const { data, error } = await supabase.from("page_availability").select("path,label,enabled,title,message,image,updated_at");
  if (error || !data?.length) return getComingSoonPages();
  return getComingSoonPages().map((page) => {
    const remote = data.find((row: any) => row.path === page.path);
    return remote ? { ...page, label: remote.label, enabled: remote.enabled, title: remote.title, message: remote.message, image: remote.image, updatedAt: remote.updated_at } : page;
  });
}
export async function saveRemoteComingSoonPage(page: ComingSoonPage): Promise<boolean> { if (!supabase) return false; const { error } = await supabase.from("page_availability").upsert({ path: page.path, label: page.label, enabled: page.enabled, title: page.title, message: page.message, image: page.image, updated_at: page.updatedAt }); if (error) throw error; return true; }
