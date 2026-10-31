import { supabase } from "./supabase";
import { starterBlocks, type PageBlock } from "./pageBlocks";

export type EditorialRole = "Owner" | "Admin" | "Staff Writer";

export type EditorialUser = {
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
  updatedAt: string;
};

const ARTICLE_KEY = "moda.editorial.articles";

export function getArticles(): EditorialArticle[] {
  try { return JSON.parse(localStorage.getItem(ARTICLE_KEY) || "[]") as EditorialArticle[]; } catch { return []; }
}

export function saveArticles(articles: EditorialArticle[]) {
  localStorage.setItem(ARTICLE_KEY, JSON.stringify(articles));
}

export async function getEditorialUser(): Promise<EditorialUser | null> {
  if (!supabase) {
    try {
      if (localStorage.getItem("light.demo.editorial-auth") === "1") return { trigger: "LIGHT Editor", email: "editor@light.studio", role: "Owner", displayName: "LIGHT Editor", canPublish: true };
    } catch {
      // localStorage unavailable
    }
    return null;
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("id", user.id)
    .single();
  if (error || !profile) {
    console.warn("[LIGHT] Editorial profile unavailable", error?.message);
    return null;
  }
  const role = profile.role === "owner" ? "Owner" : profile.role === "admin" ? "Admin" : "Staff Writer";
  return { trigger: profile.display_name, email: user.email || "", role, displayName: profile.display_name, canPublish: profile.role === "owner" || profile.role === "admin" };
}

export function createArticle(author: string): EditorialArticle {
  return { id: crypto.randomUUID(), slug: "", eyebrow: "LIGHT / PORTADA", title: "", category: "Moda", excerpt: "", lead: "", readingTime: "8 min de lectura", date: new Date().toISOString().slice(0, 10), body: "", blocks: starterBlocks(), image: "", imageCaption: "", status: "draft", isVisible: true, isFeatured: false, featuredOrder: 99, author, updatedAt: new Date().toISOString() };
}

// Supabase-ready contract: replace these local functions with supabase.from("articles") calls.
export const editorialRepository = { getArticles, saveArticles };

export async function fetchRemoteArticles(): Promise<EditorialArticle[]> {
  if (!supabase) return getArticles();
  const { data, error } = await supabase.from("articles").select("id,slug,eyebrow,title,category,excerpt,lead,reading_time,date,body,page_blocks,cover_image_path,cover_caption,status,is_visible,is_featured,featured_order,updated_at,profiles(display_name)").order("updated_at", { ascending: false });
  if (error || !data) { console.warn("[LIGHT] Supabase articles unavailable; using local demo data", error?.message); return getArticles(); }
  return data.map((row: any) => ({ id: row.id, slug: row.slug || row.id, eyebrow: row.eyebrow || `${row.category} / HISTORIA`, title: row.title, category: row.category, excerpt: row.excerpt, lead: row.lead || "", readingTime: row.reading_time || "8 min de lectura", date: row.date || row.updated_at?.slice(0, 10) || "", body: row.body || "", blocks: parsePageBlocks(row.page_blocks), image: row.cover_image_path || "", imageCaption: row.cover_caption || "", status: row.status, isVisible: row.is_visible !== false, isFeatured: row.is_featured === true, featuredOrder: Number(row.featured_order || 99), author: row.profiles?.display_name || "LIGHT", updatedAt: row.updated_at }));
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

export async function saveRemoteArticle(article: EditorialArticle): Promise<boolean> {
  if (!supabase) return false;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { error } = await supabase.from("articles").upsert({ id: article.id, author_id: user.id, slug: article.slug, eyebrow: article.eyebrow, title: article.title, category: article.category, excerpt: article.excerpt, lead: article.lead, reading_time: article.readingTime, date: article.date || null, body: article.body, page_blocks: article.blocks, cover_image_path: article.image || null, cover_caption: article.imageCaption || null, status: article.status, is_visible: article.isVisible, is_featured: article.isFeatured, featured_order: article.featuredOrder, published_at: article.status === "published" ? new Date().toISOString() : null, updated_at: article.updatedAt });
  if (error) throw new Error([error.message, error.details, error.hint, error.code ? `(${error.code})` : ""].filter(Boolean).join(" "));
  return true;
}
