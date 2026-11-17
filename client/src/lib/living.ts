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
 * Cada elemento tiene su propia hoja pública en /living/<slug>, con la reseña larga (`body`,
 * párrafos separados por una línea en blanco), la ubicación y una galería de imágenes.
 */
export type LivingItem = {
  id: string;
  slug: string;
  /** Categoría de la guía a la que pertenece ("" = sin categoría: no se publica). */
  categoryId: string;
  /** Formato con el que se muestra; se toma de su categoría. */
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
  body: string;
  location: string;
  gallery: string[];
  updatedAt: string;
};

/**
 * Categorías de la guía, creadas y borradas por el equipo en Dashboard → Living.
 * `format` decide cómo se ve en la hoja: "resort" = reseña detallada (cuatro criterios y un
 * lugar destacado arriba); "mesa" = ranking por nota con un dato estrella (`detailLabel`).
 */
export type LivingFormat = "resort" | "mesa";
export type LivingCategory = { id: string; label: string; singular: string; title: string; format: LivingFormat; detailLabel: string; featuredId: string };
export type LivingGuide = { categories: LivingCategory[]; items: LivingItem[]; featuredId: string; updatedAt: string };

export const livingFormats: { format: LivingFormat; label: string; help: string }[] = [
  { format: "resort", label: "Reseña detallada", help: "Cuatro criterios (servicio, diseño, experiencia, valor), un lugar destacado grande y tarjetas." },
  { format: "mesa", label: "Ranking", help: "Lista numerada por nota, con un dato estrella (p. ej. “Qué pedir” o “Servicio estrella”)." },
];
export const defaultLivingCategories: LivingCategory[] = [
  { id: "resorts", label: "Resorts", singular: "Resort", title: "Para quedarse más de lo previsto.", format: "resort", detailLabel: "Ideal para", featuredId: "casa-aurelia" },
  { id: "restaurantes", label: "Restaurantes", singular: "Restaurante", title: "Las mesas de la temporada.", format: "mesa", detailLabel: "Qué pedir", featuredId: "" },
];
export function blankLivingCategory(): LivingCategory {
  return { id: crypto.randomUUID().slice(0, 8), label: "", singular: "", title: "", format: "mesa", detailLabel: "Lo imprescindible", featuredId: "" };
}

export const livingGuideKey = "public:living-guide";
export const livingKinds: { kind: LivingKind; label: string; singular: string; section: string }[] = [
  { kind: "resort", label: "Resorts", singular: "Resort", section: "01 / The Resort Edit" },
  { kind: "mesa", label: "Restaurantes", singular: "Restaurante", section: "02 / La Mesa" },
  { kind: "noche", label: "Eventos", singular: "Evento", section: "03 / After Dark" },
];
export const livingStatuses: LivingStatus[] = ["Plazas limitadas", "Lista de espera", "Abierto"];
export const livingCriteria: [keyof LivingScores, string][] = [["servicio", "Servicio"], ["diseno", "Diseño"], ["experiencia", "Experiencia"], ["valor", "Valor"]];

const unsplash = (id: string, width: number) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=90`;
const base = { slug: "", body: "", location: "", gallery: [] as string[], place: "", price: 3 as LivingPrice, scores: { servicio: 4.5, diseno: 4.5, experiencia: 4.5, valor: 4.5 }, score: 4.5, idealFor: "", signature: "", date: "", status: "Abierto" as LivingStatus, updatedAt: "" };

export function blankLivingItem(category: LivingCategory | null): LivingItem {
  return { ...base, scores: { ...base.scores }, gallery: [], id: crypto.randomUUID(), categoryId: category?.id || "", kind: category?.format || "mesa", name: "", image: "", category: "", verdict: "", updatedAt: new Date().toISOString() };
}

export const defaultLivingItems: LivingItem[] = [
  { ...base, categoryId: "", slug: "casa-aurelia", id: "casa-aurelia", kind: "resort", name: "Casa Aurelia", place: "Costa Norte", category: "Resort & Spa", image: unsplash("photo-1566073771259-6a8506099945", 1600), scores: { servicio: 4.9, diseno: 4.8, experiencia: 4.9, valor: 4.4 }, verdict: "Un resort que entiende el lujo como silencio: piscinas que miran al horizonte, servicio que se anticipa y noches sin prisa.", idealFor: "Escapadas largas en pareja", price: 4, location: "Carretera de la Costa Norte, km 12", body: "Casa Aurelia no compite por llamar la atención. Se llega por un camino de tierra clara, entre palmeras, y lo primero que se oye es el agua: una piscina larga que parece seguir hasta el mar.\n\nLas habitaciones son pocas y amplias, de madera y lino, con terrazas orientadas al atardecer. El servicio tiene ese talento raro de aparecer justo antes de que lo necesites y desaparecer en cuanto ya no hace falta.\n\nLo que se recuerda después no es un gran gesto, sino una suma de detalles: el desayuno servido sin prisa, las tumbonas siempre a la sombra, la sensación de que nadie te está mirando el reloj." },
  { ...base, categoryId: "", slug: "hotel-marisol", id: "hotel-marisol", kind: "resort", name: "Hotel Marisol", place: "Bahía Clara", category: "Hotel de playa", image: unsplash("photo-1507525428034-b723cf961d3e", 1200), scores: { servicio: 4.6, diseno: 4.5, experiencia: 4.7, valor: 4.6 }, verdict: "Arena blanca, lino y una terraza al atardecer que justifica el viaje por sí sola.", idealFor: "Fines de semana de sol", price: 3 },
  { ...base, categoryId: "", slug: "the-glass-house", id: "the-glass-house", kind: "resort", name: "The Glass House", place: "Valle Alto", category: "Refugio de diseño", image: unsplash("photo-1618221195710-dd6b41faaea6", 1200), scores: { servicio: 4.4, diseno: 4.9, experiencia: 4.6, valor: 4.2 }, verdict: "Arquitectura que desaparece en el paisaje. Pocas habitaciones, mucha luz y una biblioteca que invita a quedarse.", idealFor: "Desconectar de verdad", price: 4 },
  { ...base, categoryId: "", slug: "kasa-niwa", id: "kasa-niwa", kind: "resort", name: "Kasa Niwa", place: "Distrito Antiguo", category: "Ryokan contemporáneo", image: unsplash("photo-1528360983277-13d401cdc186", 1200), scores: { servicio: 4.8, diseno: 4.7, experiencia: 4.8, valor: 4.3 }, verdict: "El ritual como forma de hospitalidad: jardines, té al amanecer y un baño que cambia el ritmo del día.", idealFor: "Viajeros que buscan calma", price: 3 },
  { ...base, categoryId: "", slug: "osteria-lume", id: "osteria-lume", kind: "mesa", name: "Osteria Lume", category: "Italiana de autor", place: "Puerto Viejo", image: unsplash("photo-1414235077428-338989a2e8c0", 1000), score: 4.8, verdict: "Pasta fresca, vinos naturales y una sala que suena a celebración.", price: 3, signature: "Tagliolini al limón y bottarga" },
  { ...base, categoryId: "", slug: "le-jardin-noir", id: "le-jardin-noir", kind: "mesa", name: "Le Jardin Noir", category: "Francesa contemporánea", place: "Jardines del Este", image: unsplash("photo-1517248135467-4c7edcad34c4", 1000), score: 4.7, verdict: "Un menú degustación que juega con la sombra y la luz, servido con precisión de reloj.", price: 4, signature: "Pichón, cereza y cacao" },
  { ...base, categoryId: "", slug: "mar-de-fondo", id: "mar-de-fondo", kind: "mesa", name: "Mar de Fondo", category: "Marisquería", place: "Muelle Sur", image: unsplash("photo-1530789253388-582c481c54b0", 1000), score: 4.5, verdict: "Producto del día, brasa y una barra frente al mar para comer sin mirar el reloj.", price: 2, signature: "Pescado entero a la brasa" },
  { ...base, categoryId: "", slug: "salon-ocho", id: "salon-ocho", kind: "mesa", name: "Salón Ocho", category: "Cocina de temporada", place: "Centro", image: unsplash("photo-1469474968028-56623f02e42e", 1000), score: 4.4, verdict: "Ocho mesas, una carta que cambia cada semana y la sensación de cenar en casa de alguien con mucho gusto.", price: 2, signature: "Tomates de huerta y aceite verde" },
  { ...base, categoryId: "", slug: "casa-light", id: "casa-light", kind: "noche", date: "12—15 JUN", name: "Casa LIGHT", category: "Casa Aurelia · Costa Norte", image: unsplash("photo-1530789253388-582c481c54b0", 1000), score: 4.9, verdict: "Cuatro días de cocina, cerámica y mar con el equipo de LIGHT.", status: "Plazas limitadas" },
  { ...base, categoryId: "", slug: "open-rooms", id: "open-rooms", kind: "noche", date: "04—07 SEP", name: "Open Rooms", category: "Kasa Niwa · Distrito Antiguo", image: unsplash("photo-1528360983277-13d401cdc186", 1000), score: 4.7, verdict: "Arquitectura, jardines y el ritual del té en sesiones privadas.", status: "Lista de espera" },
  { ...base, categoryId: "", slug: "mesa-larga", id: "mesa-larga", kind: "noche", date: "21 OCT", name: "Una mesa larga", category: "Salón Ocho · Centro", image: unsplash("photo-1414235077428-338989a2e8c0", 1000), score: 4.6, verdict: "Una cena compartida para cerrar la temporada.", status: "Abierto" },
];
const legacyCategoryOf = (kind: LivingKind) => kind === "resort" ? "resorts" : kind === "mesa" ? "restaurantes" : "";
export const defaultLivingGuide: LivingGuide = { categories: defaultLivingCategories, items: defaultLivingItems.filter((item) => item.kind !== "noche").map((item) => ({ ...item, categoryId: legacyCategoryOf(item.kind) })), featuredId: "", updatedAt: "" };

const clampScore = (value: unknown, fallback = 4.5) => { const number = Number(value); return Number.isFinite(number) ? Math.max(0, Math.min(5, Math.round(number * 10) / 10)) : fallback; };
const clampPrice = (value: unknown): LivingPrice => { const number = Math.round(Number(value)); return (number >= 1 && number <= 4 ? number : 3) as LivingPrice; };
const text = (value: unknown) => typeof value === "string" ? value : "";

/** Nombre → dirección legible para la hoja pública: “Casa Aurelia” → casa-aurelia. */
export const livingSlugify = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** Slug único dentro de la guía (si se repite, se le añade un trozo del id). */
export function uniqueLivingSlug(item: LivingItem, items: LivingItem[]) {
  const wanted = livingSlugify(item.slug || item.name) || item.id.slice(0, 8);
  return items.some((other) => other.id !== item.id && other.slug === wanted) ? `${wanted}-${item.id.slice(0, 4)}` : wanted;
}
export const livingHref = (item: Pick<LivingItem, "slug" | "id">) => `/living/${item.slug || item.id}`;
/** Los párrafos de la reseña larga. */
export const livingParagraphs = (body: string) => body.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
export type LivingBlock = { type: "text"; text: string } | { type: "image"; src: string; caption: string };
/** Imagen dentro de la reseña: un párrafo con ![pie de foto](https://…) o solo la URL. */
export const livingImageMarkup = (src: string, caption: string) => `![${caption.replace(/[\[\]\n]/g, " ").trim()}](${src.trim()})`;
/** La reseña larga por bloques: párrafos de texto e imágenes. */
export function livingBlocks(body: string): LivingBlock[] {
  return livingParagraphs(body).map((part): LivingBlock => {
    const markup = part.match(/^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)$/);
    if (markup) return { type: "image", src: markup[2], caption: markup[1].trim() };
    if (/^https?:\/\/\S+$/.test(part)) return { type: "image", src: part, caption: "" };
    return { type: "text", text: part };
  });
}

function normalizeItem(value: any): LivingItem | null {
  if (!value || typeof value !== "object" || !value.id) return null;
  const kind: LivingKind = value.kind === "mesa" || value.kind === "noche" ? value.kind : "resort";
  const scores = value.scores && typeof value.scores === "object" ? value.scores : {};
  return {
    id: String(value.id), slug: text(value.slug) || livingSlugify(text(value.name)) || String(value.id), categoryId: typeof value.categoryId === "string" ? value.categoryId : legacyCategoryOf(kind), kind, name: text(value.name), image: text(value.image), category: text(value.category), place: text(value.place), verdict: text(value.verdict),
    price: clampPrice(value.price), scores: { servicio: clampScore(scores.servicio), diseno: clampScore(scores.diseno), experiencia: clampScore(scores.experiencia), valor: clampScore(scores.valor) },
    score: clampScore(value.score), idealFor: text(value.idealFor), signature: text(value.signature), date: text(value.date),
    status: livingStatuses.includes(value.status) ? value.status : "Abierto", body: text(value.body), location: text(value.location),
    gallery: Array.isArray(value.gallery) ? value.gallery.filter((url: unknown): url is string => typeof url === "string" && url.trim() !== "").map((url: string) => url.trim()) : [],
    updatedAt: text(value.updatedAt),
  };
}

function normalizeCategory(value: any): LivingCategory | null {
  if (!value || typeof value !== "object" || !text(value.id).trim() || !text(value.label).trim()) return null;
  const format: LivingFormat = value.format === "resort" ? "resort" : "mesa";
  return { id: text(value.id).trim(), label: text(value.label).trim(), singular: text(value.singular).trim() || text(value.label).trim(), title: text(value.title), format, detailLabel: text(value.detailLabel) || (format === "resort" ? "Ideal para" : "Lo imprescindible"), featuredId: text(value.featuredId) };
}

/**
 * Guías guardadas antes de las categorías: los resorts y restaurantes pasan a sus categorías y
 * los eventos (After Dark) quedan sin categoría — los eventos viven en la hoja Eventos.
 */
export function normalizeLivingGuide(value: unknown): LivingGuide {
  if (!value || typeof value !== "object" || !Array.isArray((value as LivingGuide).items)) return defaultLivingGuide;
  const raw = value as Partial<LivingGuide>;
  const legacy = !Array.isArray(raw.categories);
  const categories = legacy ? defaultLivingCategories.map((category) => category.id === "resorts" ? { ...category, featuredId: text(raw.featuredId) || category.featuredId } : category) : (raw.categories || []).map(normalizeCategory).filter((category): category is LivingCategory => Boolean(category));
  const formatOf = new Map(categories.map((category) => [category.id, category.format]));
  const items = (raw.items || []).map(normalizeItem).filter((item): item is LivingItem => Boolean(item)).map((item) => {
    const categoryId = formatOf.has(item.categoryId) ? item.categoryId : "";
    return { ...item, categoryId, kind: (categoryId ? formatOf.get(categoryId) : item.kind) as LivingKind };
  });
  return { categories, items, featuredId: "", updatedAt: text(raw.updatedAt) };
}

/** Nota final de un resort: media de los cuatro criterios. */
export const livingOverall = (scores: LivingScores) => Math.round(((scores.servicio + scores.diseno + scores.experiencia + scores.valor) / 4) * 10) / 10;
export const livingScoreOf = (item: LivingItem) => item.kind === "resort" ? livingOverall(item.scores) : item.score;

export type LivingSection = { category: LivingCategory; cover: LivingItem | null; items: LivingItem[]; count: number };

/**
 * La guía tal como se publica: una sección por categoría con lugares, en el orden de las
 * categorías. En las de reseña detallada el destacado va primero (o el primero de la lista);
 * en los rankings, por nota.
 */
export function arrangeLivingGuide(guide: LivingGuide): LivingSection[] {
  const byScore = (a: LivingItem, b: LivingItem) => livingScoreOf(b) - livingScoreOf(a);
  return guide.categories.map((category) => {
    const items = guide.items.filter((item) => item.categoryId === category.id);
    if (category.format === "mesa") return { category, cover: null, items: [...items].sort(byScore), count: items.length };
    const cover = items.find((item) => item.id === category.featuredId) || items[0] || null;
    return { category, cover, items: items.filter((item) => item !== cover), count: items.length };
  }).filter((section) => section.count > 0);
}
export const livingAnchor = (category: Pick<LivingCategory, "id">) => `cat-${category.id}`;
export const livingCategoryOf = (guide: LivingGuide, item: LivingItem) => guide.categories.find((category) => category.id === item.categoryId) || null;

/** Último valor conocido (instantáneo, desde caché). */
export function getLivingGuide(): LivingGuide { const cached = readCachedSetting<unknown>(livingGuideKey); return cached === null ? defaultLivingGuide : normalizeLivingGuide(cached); }
export async function fetchLivingGuide(): Promise<LivingGuide> { return normalizeLivingGuide(await getContentSetting<unknown>(livingGuideKey, defaultLivingGuide)); }
export async function saveLivingGuide(guide: LivingGuide) { return saveContentSetting(livingGuideKey, { ...guide, updatedAt: new Date().toISOString() }); }
export function useLivingGuide() { return useContentSetting(livingGuideKey, defaultLivingGuide, normalizeLivingGuide); }
