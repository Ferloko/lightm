import { getContentSetting, readCachedSetting, saveContentSetting, useContentSetting } from "./contentSettings";

/* LIGHT Living — The Guide. Todos los lugares son selecciones editoriales ficticias de LIGHT. */

export type LivingKind = "resort" | "mesa" | "noche";
export type LivingScores = { servicio: number; diseno: number; experiencia: number; valor: number };
export type LivingPrice = 1 | 2 | 3 | 4;
export type LivingStatus = "Plazas limitadas" | "Lista de espera" | "Abierto";

/**
 * Un elemento de la guía. Los campos comunes valen para los tres tipos; el resto solo se usa
 * en su tipo: `scores` e `idealFor` en resorts, `signature` en mesas, `date` y `status` en noches.
 * `category` es el tipo de estancia (resort), la cocina (mesa) o el lugar del evento (noche).
 */
export type LivingItem = {
  id: string;
  kind: LivingKind;
  name: string;
  image: string;
  category: string;
  place: string;
  verdict: string;
  price: LivingPrice;
  scores: LivingScores;
  score: number;
  idealFor: string;
  signature: string;
  date: string;
  status: LivingStatus;
  updatedAt: string;
};

export type LivingGuide = { items: LivingItem[]; featuredId: string; updatedAt: string };

export const livingGuideKey = "public:living-guide";
export const livingKinds: { kind: LivingKind; label: string; singular: string; section: string }[] = [
  { kind: "resort", label: "Resorts", singular: "Resort", section: "01 / The Resort Edit" },
  { kind: "mesa", label: "Restaurantes", singular: "Restaurante", section: "02 / La Mesa" },
  { kind: "noche", label: "Eventos", singular: "Evento", section: "03 / After Dark" },
];
export const livingStatuses: LivingStatus[] = ["Plazas limitadas", "Lista de espera", "Abierto"];
export const livingCriteria: [keyof LivingScores, string][] = [["servicio", "Servicio"], ["diseno", "Diseño"], ["experiencia", "Experiencia"], ["valor", "Valor"]];

const unsplash = (id: string, width: number) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=90`;
const base = { place: "", price: 3 as LivingPrice, scores: { servicio: 4.5, diseno: 4.5, experiencia: 4.5, valor: 4.5 }, score: 4.5, idealFor: "", signature: "", date: "", status: "Abierto" as LivingStatus, updatedAt: "" };

export function blankLivingItem(kind: LivingKind): LivingItem {
  return { ...base, scores: { ...base.scores }, id: crypto.randomUUID(), kind, name: "", image: "", category: kind === "resort" ? "Resort & Spa" : "", verdict: "", updatedAt: new Date().toISOString() };
}

export const defaultLivingItems: LivingItem[] = [
  { ...base, id: "casa-aurelia", kind: "resort", name: "Casa Aurelia", place: "Costa Norte", category: "Resort & Spa", image: unsplash("photo-1566073771259-6a8506099945", 1600), scores: { servicio: 4.9, diseno: 4.8, experiencia: 4.9, valor: 4.4 }, verdict: "Un resort que entiende el lujo como silencio: piscinas que miran al horizonte, servicio que se anticipa y noches sin prisa.", idealFor: "Escapadas largas en pareja", price: 4 },
  { ...base, id: "hotel-marisol", kind: "resort", name: "Hotel Marisol", place: "Bahía Clara", category: "Hotel de playa", image: unsplash("photo-1507525428034-b723cf961d3e", 1200), scores: { servicio: 4.6, diseno: 4.5, experiencia: 4.7, valor: 4.6 }, verdict: "Arena blanca, lino y una terraza al atardecer que justifica el viaje por sí sola.", idealFor: "Fines de semana de sol", price: 3 },
  { ...base, id: "the-glass-house", kind: "resort", name: "The Glass House", place: "Valle Alto", category: "Refugio de diseño", image: unsplash("photo-1618221195710-dd6b41faaea6", 1200), scores: { servicio: 4.4, diseno: 4.9, experiencia: 4.6, valor: 4.2 }, verdict: "Arquitectura que desaparece en el paisaje. Pocas habitaciones, mucha luz y una biblioteca que invita a quedarse.", idealFor: "Desconectar de verdad", price: 4 },
  { ...base, id: "kasa-niwa", kind: "resort", name: "Kasa Niwa", place: "Distrito Antiguo", category: "Ryokan contemporáneo", image: unsplash("photo-1528360983277-13d401cdc186", 1200), scores: { servicio: 4.8, diseno: 4.7, experiencia: 4.8, valor: 4.3 }, verdict: "El ritual como forma de hospitalidad: jardines, té al amanecer y un baño que cambia el ritmo del día.", idealFor: "Viajeros que buscan calma", price: 3 },
  { ...base, id: "osteria-lume", kind: "mesa", name: "Osteria Lume", category: "Italiana de autor", place: "Puerto Viejo", image: unsplash("photo-1414235077428-338989a2e8c0", 1000), score: 4.8, verdict: "Pasta fresca, vinos naturales y una sala que suena a celebración.", price: 3, signature: "Tagliolini al limón y bottarga" },
  { ...base, id: "le-jardin-noir", kind: "mesa", name: "Le Jardin Noir", category: "Francesa contemporánea", place: "Jardines del Este", image: unsplash("photo-1517248135467-4c7edcad34c4", 1000), score: 4.7, verdict: "Un menú degustación que juega con la sombra y la luz, servido con precisión de reloj.", price: 4, signature: "Pichón, cereza y cacao" },
  { ...base, id: "mar-de-fondo", kind: "mesa", name: "Mar de Fondo", category: "Marisquería", place: "Muelle Sur", image: unsplash("photo-1530789253388-582c481c54b0", 1000), score: 4.5, verdict: "Producto del día, brasa y una barra frente al mar para comer sin mirar el reloj.", price: 2, signature: "Pescado entero a la brasa" },
  { ...base, id: "salon-ocho", kind: "mesa", name: "Salón Ocho", category: "Cocina de temporada", place: "Centro", image: unsplash("photo-1469474968028-56623f02e42e", 1000), score: 4.4, verdict: "Ocho mesas, una carta que cambia cada semana y la sensación de cenar en casa de alguien con mucho gusto.", price: 2, signature: "Tomates de huerta y aceite verde" },
  { ...base, id: "casa-light", kind: "noche", date: "12—15 JUN", name: "Casa LIGHT", category: "Casa Aurelia · Costa Norte", image: unsplash("photo-1530789253388-582c481c54b0", 1000), score: 4.9, verdict: "Cuatro días de cocina, cerámica y mar con el equipo de LIGHT.", status: "Plazas limitadas" },
  { ...base, id: "open-rooms", kind: "noche", date: "04—07 SEP", name: "Open Rooms", category: "Kasa Niwa · Distrito Antiguo", image: unsplash("photo-1528360983277-13d401cdc186", 1000), score: 4.7, verdict: "Arquitectura, jardines y el ritual del té en sesiones privadas.", status: "Lista de espera" },
  { ...base, id: "mesa-larga", kind: "noche", date: "21 OCT", name: "Una mesa larga", category: "Salón Ocho · Centro", image: unsplash("photo-1414235077428-338989a2e8c0", 1000), score: 4.6, verdict: "Una cena compartida para cerrar la temporada.", status: "Abierto" },
];
export const defaultLivingGuide: LivingGuide = { items: defaultLivingItems, featuredId: "casa-aurelia", updatedAt: "" };

const clampScore = (value: unknown, fallback = 4.5) => { const number = Number(value); return Number.isFinite(number) ? Math.max(0, Math.min(5, Math.round(number * 10) / 10)) : fallback; };
const clampPrice = (value: unknown): LivingPrice => { const number = Math.round(Number(value)); return (number >= 1 && number <= 4 ? number : 3) as LivingPrice; };
const text = (value: unknown) => typeof value === "string" ? value : "";

function normalizeItem(value: any): LivingItem | null {
  if (!value || typeof value !== "object" || !value.id) return null;
  const kind: LivingKind = value.kind === "mesa" || value.kind === "noche" ? value.kind : "resort";
  const scores = value.scores && typeof value.scores === "object" ? value.scores : {};
  return {
    id: String(value.id), kind, name: text(value.name), image: text(value.image), category: text(value.category), place: text(value.place), verdict: text(value.verdict),
    price: clampPrice(value.price), scores: { servicio: clampScore(scores.servicio), diseno: clampScore(scores.diseno), experiencia: clampScore(scores.experiencia), valor: clampScore(scores.valor) },
    score: clampScore(value.score), idealFor: text(value.idealFor), signature: text(value.signature), date: text(value.date),
    status: livingStatuses.includes(value.status) ? value.status : "Abierto", updatedAt: text(value.updatedAt),
  };
}

export function normalizeLivingGuide(value: unknown): LivingGuide {
  if (!value || typeof value !== "object" || !Array.isArray((value as LivingGuide).items)) return defaultLivingGuide;
  const raw = value as Partial<LivingGuide>;
  const items = (raw.items || []).map(normalizeItem).filter((item): item is LivingItem => Boolean(item));
  return { items, featuredId: text(raw.featuredId), updatedAt: text(raw.updatedAt) };
}

/** Nota final de un resort: media de los cuatro criterios. */
export const livingOverall = (scores: LivingScores) => Math.round(((scores.servicio + scores.diseno + scores.experiencia + scores.valor) / 4) * 10) / 10;
export const livingScoreOf = (item: LivingItem) => item.kind === "resort" ? livingOverall(item.scores) : item.score;

/**
 * Reparte la guía en sus tres secciones tal como se publican: el resort destacado primero
 * (o el primero de la lista si no hay ninguno), las mesas ordenadas por nota (es un ranking)
 * y el resto en el orden de la lista.
 */
export function arrangeLivingGuide(guide: LivingGuide) {
  const byScore = (a: LivingItem, b: LivingItem) => livingScoreOf(b) - livingScoreOf(a);
  const resorts = guide.items.filter((item) => item.kind === "resort");
  const cover = resorts.find((item) => item.id === guide.featuredId) || resorts[0] || null;
  return {
    cover,
    resorts: resorts.filter((item) => item !== cover),
    resortCount: resorts.length,
    tables: guide.items.filter((item) => item.kind === "mesa").sort(byScore),
    nights: guide.items.filter((item) => item.kind === "noche"),
  };
}

/** Último valor conocido (instantáneo, desde caché). */
export function getLivingGuide(): LivingGuide { const cached = readCachedSetting<unknown>(livingGuideKey); return cached === null ? defaultLivingGuide : normalizeLivingGuide(cached); }
export async function fetchLivingGuide(): Promise<LivingGuide> { return normalizeLivingGuide(await getContentSetting<unknown>(livingGuideKey, defaultLivingGuide)); }
export async function saveLivingGuide(guide: LivingGuide) { return saveContentSetting(livingGuideKey, { ...guide, updatedAt: new Date().toISOString() }); }
export function useLivingGuide() { return useContentSetting(livingGuideKey, defaultLivingGuide, normalizeLivingGuide); }
