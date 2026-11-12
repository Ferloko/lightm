import { describeError, isDemoMode, supabase } from "./supabase";
import { starterBlocks, type PageBlock } from "./pageBlocks";

export type EditorialRole = "Owner" | "Admin" | "Staff Writer";

export type EditorialUser = {
  id?: string;
  trigger: string;
  email: string;
  role: EditorialRole;
  displayName: string;
  canPublish: boolean;
};

export type EditorialArticle = {
  id: string;
  slug: string;
  eyebrow: string;
  title: string;
  category: string;
  excerpt: string;
  lead: string;
  readingTime: string;
  date: string;
  body: string;
  blocks: PageBlock[];
  image: string;
  imageCaption: string;
  status: "draft" | "published";
  isVisible: boolean;
  isFeatured: boolean;
  featuredOrder: number;
  author: string;
  authorId?: string;
  /** Set once by the database the first time the article is published. */
  publishedAt?: string;
  updatedAt: string;
};

const DEMO_ARTICLES_KEY = "light.demo.editorial-articles";

function getDemoArticles(): EditorialArticle[] {
  try {
    const value = JSON.parse(localStorage.getItem(DEMO_ARTICLES_KEY) || "[]");
    return Array.isArray(value) ? value as EditorialArticle[] : [];
  } catch {
    return [];
  }
}

function saveDemoArticle(article: EditorialArticle): boolean {
  try {
    if (!isDemoMode || localStorage.getItem("light.demo.editorial-auth") !== "1") return false;
    const articles = getDemoArticles().filter((item) => item.id !== article.id);
    localStorage.setItem(DEMO_ARTICLES_KEY, JSON.stringify([article, ...articles]));
    window.dispatchEvent(new Event("light:editorial-updated"));
    return true;
  } catch {
    return false;
  }
}

function deleteDemoArticle(articleId: string): boolean {
  try {
    if (!isDemoMode || localStorage.getItem("light.demo.editorial-auth") !== "1") return false;
    localStorage.setItem(DEMO_ARTICLES_KEY, JSON.stringify(getDemoArticles().filter((item) => item.id !== articleId)));
    window.dispatchEvent(new Event("light:editorial-updated"));
    return true;
  } catch {
    return false;
  }
}

export async function getEditorialUser(): Promise<EditorialUser | null> {
  if (!supabase) {
    if (!isDemoMode) return null;
    try {
      if (localStorage.getItem("light.demo.editorial-auth") === "1") return { trigger: "LIGHT Editor", email: "editor@light.studio", role: "Owner", displayName: "LIGHT Editor", canPublish: true };
    } catch {
      // localStorage unavailable
    }
    return null;
  }
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null; // no network call for anonymous visitors
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (error || !profile) {
    console.warn("[LIGHT] Editorial profile unavailable", error?.message);
    return null;
  }
  if (profile.is_active === false) return null; // blocked from the Team tab
  const role = profile.role === "owner" ? "Owner" : profile.role === "admin" ? "Admin" : "Staff Writer";
  return { id: user.id, trigger: profile.display_name, email: user.email || "", role, displayName: profile.display_name, canPublish: profile.role === "owner" || profile.role === "admin" };
}

export function createArticle(author: string): EditorialArticle {
  return { id: crypto.randomUUID(), slug: "", eyebrow: "LIGHT / PORTADA", title: "", category: "Moda", excerpt: "", lead: "", readingTime: "", date: new Date().toISOString().slice(0, 10), body: "", blocks: starterBlocks(), image: "", imageCaption: "", status: "draft", isVisible: true, isFeatured: false, featuredOrder: 99, author, updatedAt: new Date().toISOString() };
}

const fullColumns = "id,slug,eyebrow,title,category,excerpt,lead,reading_time,date,body,page_blocks,cover_image_path,cover_caption,status,is_visible,is_featured,featured_order,published_at,updated_at,author_id,author_name";
const summaryColumns = "id,slug,eyebrow,title,category,excerpt,lead,reading_time,date,cover_image_path,cover_caption,status,is_visible,is_featured,featured_order,published_at,updated_at,author_id,author_name";

/** Every article the current session may read (Dashboard). */
export async function fetchRemoteArticles(): Promise<EditorialArticle[]> {
  if (!supabase) return getDemoArticles();
  const { data, error } = await supabase.from("articles").select(`${fullColumns},profiles(display_name)`).order("updated_at", { ascending: false });
  if (error || !data) { console.warn("[LIGHT] Supabase articles unavailable", error?.message); return []; }
  return data.map(fromArticleRow);
}

/** Published and visible articles without their body — for lists (Home, Archivo, secciones). */
export async function fetchPublishedArticleSummaries(): Promise<EditorialArticle[]> {
  if (!supabase) return getDemoArticles().filter((article) => article.status === "published" && article.isVisible !== false);
  const { data, error } = await supabase.from("articles").select(summaryColumns).eq("status", "published").eq("is_visible", true).order("updated_at", { ascending: false });
  if (error || !data) { console.warn("[LIGHT] Supabase articles unavailable", error?.message); return []; }
  return data.map(fromArticleRow);
}

/** One published article by slug (or id), with its full page. */
export async function fetchPublishedArticle(slugOrId: string): Promise<EditorialArticle | null> {
  if (!supabase) return getDemoArticles().find((article) => article.status === "published" && article.isVisible !== false && (article.slug === slugOrId || article.id === slugOrId)) || null;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
  let query = supabase.from("articles").select(fullColumns).eq("status", "published").eq("is_visible", true);
  query = isUuid ? query.or(`slug.eq.${slugOrId},id.eq.${slugOrId}`) : query.eq("slug", slugOrId);
  const { data, error } = await query.limit(1).maybeSingle();
  if (error) { console.warn("[LIGHT] Supabase article unavailable", error.message); return null; }
  return data ? fromArticleRow(data) : null;
}

function fromArticleRow(row: any): EditorialArticle {
  return ({ id: row.id, slug: row.slug || row.id, eyebrow: row.eyebrow || `${row.category} / HISTORIA`, title: row.title, category: row.category, excerpt: row.excerpt, lead: row.lead || "", readingTime: row.reading_time || "8 min de lectura", date: row.date || row.updated_at?.slice(0, 10) || "", body: row.body || "", blocks: parsePageBlocks(row.page_blocks), image: row.cover_image_path || "", imageCaption: row.cover_caption || "", status: row.status, isVisible: row.is_visible !== false, isFeatured: row.is_featured === true, featuredOrder: Number(row.featured_order || 99), author: row.author_name || row.profiles?.display_name || "LIGHT", authorId: row.author_id || undefined, publishedAt: row.published_at || undefined, updatedAt: row.updated_at });
}

function parsePageBlocks(value: unknown): PageBlock[] {
  const blocks = typeof value === "string" ? safeJsonParse(value) : value;
  return Array.isArray(blocks) && blocks.length > 0 ? blocks as PageBlock[] : starterBlocks();
}

function safeJsonParse(value: string): unknown {
  try { return JSON.parse(value); } catch { return null; }
}

export async function uploadRemoteImage(file: File, articleId: string): Promise<string | null> {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Supabase Auth requiere un usuario editorial antes de subir imágenes.");
  const path = `${user.id}/${articleId}-${Date.now()}-${file.name.replace(/[^a-z0-9._-]/gi, "-")}`;
  const { error } = await supabase.storage.from("editorial-assets").upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return supabase.storage.from("editorial-assets").getPublicUrl(path).data.publicUrl;
}

export function slugify(value: string) { return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80) || "historia"; }

/**
 * The URL is generated from the title while the story is a draft. Once it has been
 * published, the slug is frozen so shared links keep working after a title change.
 */
export function resolveArticleSlug(article: EditorialArticle, wasPublished: boolean) {
  if (wasPublished && article.slug) return article.slug;
  return slugify(article.title);
}

function errorText(error: unknown) { return describeError(error); }
function isSlugConflict(error: { code?: string; message?: string } | null) { return Boolean(error && error.code === "23505" && /slug/i.test(error.message || "")); }

/** Saves an article and returns it as stored (the slug may get a suffix if taken). */
export async function saveRemoteArticle(article: EditorialArticle): Promise<EditorialArticle | null> {
  if (!supabase) return saveDemoArticle(article) ? article : null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: existing, error: lookupError } = await supabase.from("articles").select("id,published_at").eq("id", article.id).maybeSingle();
  if (lookupError) throw new Error(errorText(lookupError));
  // published_at is owned by the database (trigger keep_article_published_at); it is only sent on first insert.
  const payload = { slug: article.slug, eyebrow: article.eyebrow, title: article.title, category: article.category, excerpt: article.excerpt, lead: article.lead, reading_time: article.readingTime, date: article.date || null, body: article.body, page_blocks: article.blocks, cover_image_path: article.image || null, cover_caption: article.imageCaption || null, status: article.status, is_visible: article.isVisible, is_featured: article.isFeatured, featured_order: article.featuredOrder, updated_at: article.updatedAt };
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const slug = attempt === 0 ? payload.slug : `${payload.slug}-${Math.random().toString(36).slice(2, 6)}`;
    if (existing) {
      const update = { ...payload, slug, ...(article.status === "published" && !existing.published_at ? { published_at: new Date().toISOString() } : {}) };
      const { error } = await supabase.from("articles").update(update).eq("id", article.id);
      if (isSlugConflict(error)) continue;
      if (error) throw new Error(errorText(error));
      return { ...article, slug, publishedAt: existing.published_at || (article.status === "published" ? update.published_at : undefined) };
    }
    const { data: profile, error: profileError } = await supabase.from("profiles").select("display_name").eq("id", user.id).single();
    if (profileError) throw new Error(errorText(profileError));
    const publishedAt = article.status === "published" ? new Date().toISOString() : null;
    const { error } = await supabase.from("articles").insert({ id: article.id, author_id: user.id, author_name: profile.display_name, ...payload, slug, published_at: publishedAt });
    if (isSlugConflict(error)) continue;
    if (error) throw new Error(errorText(error));
    return { ...article, slug, authorId: user.id, author: profile.display_name, publishedAt: publishedAt || undefined };
  }
  throw new Error("Ya existe otra historia con esa URL. Cambia el título e inténtalo de nuevo.");
}

export async function deleteRemoteArticle(articleId: string): Promise<boolean> {
  if (!supabase) return deleteDemoArticle(articleId);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data, error } = await supabase.from("articles").delete().eq("id", articleId).select("id").maybeSingle();
  if (error) throw new Error(errorText(error));
  if (!data) throw new Error("El artículo no se borró: verifica permisos de Owner/Admin.");
  return true;
}
