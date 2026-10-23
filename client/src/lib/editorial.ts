import { supabase } from "./supabase";

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
  title: string;
  category: string;
  excerpt: string;
  body: string;
  image: string;
  status: "draft" | "published";
  author: string;
  updatedAt: string;
};

// Temporary development credentials. Replace with Supabase Auth before production.
export const editorialUsers: Record<string, EditorialUser> = {
  snow: { trigger: "Snow", email: "snow@moda.studio", role: "Owner", displayName: "Snow", canPublish: true },
  songbird: { trigger: "Songbird", email: "songbird@moda.studio", role: "Admin", displayName: "Songbird", canPublish: true },
  moonglow: { trigger: "Moonglow", email: "moonglow@moda.studio", role: "Staff Writer", displayName: "Moonglow", canPublish: false },
  bianca: { trigger: "Bianca", email: "bianca@moda.studio", role: "Staff Writer", displayName: "Bianca", canPublish: false },
};

export const TEMPORARY_PASSWORD = "MODA-DEMO-2026";
const ARTICLE_KEY = "moda.editorial.articles";
const SESSION_KEY = "moda.editorial.session";

export function getArticles(): EditorialArticle[] {
  try { return JSON.parse(localStorage.getItem(ARTICLE_KEY) || "[]") as EditorialArticle[]; } catch { return []; }
}

export function saveArticles(articles: EditorialArticle[]) {
  localStorage.setItem(ARTICLE_KEY, JSON.stringify(articles));
}

export function getSession(): EditorialUser | null {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null") as EditorialUser | null; } catch { return null; }
}

export function setSession(user: EditorialUser | null) {
  if (user) sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  else sessionStorage.removeItem(SESSION_KEY);
}

export function createArticle(author: string): EditorialArticle {
  return { id: crypto.randomUUID(), title: "", category: "Moda", excerpt: "", body: "", image: "", status: "draft", author, updatedAt: new Date().toISOString() };
}

// Supabase-ready contract: replace these local functions with supabase.from("articles") calls.
export const editorialRepository = { getArticles, saveArticles };

export async function fetchRemoteArticles(): Promise<EditorialArticle[]> {
  if (!supabase) return getArticles();
  const { data, error } = await supabase.from("articles").select("id,title,category,excerpt,body,cover_image_path,status,updated_at,profiles(display_name)").order("updated_at", { ascending: false });
  if (error || !data) { console.warn("[MODA] Supabase articles unavailable; using local demo data", error?.message); return getArticles(); }
  return data.map((row: any) => ({ id: row.id, title: row.title, category: row.category, excerpt: row.excerpt, body: row.body, image: row.cover_image_path || "", status: row.status, author: row.profiles?.display_name || "MODA", updatedAt: row.updated_at }));
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
  const { error } = await supabase.from("articles").upsert({ id: article.id, author_id: user.id, title: article.title, category: article.category, excerpt: article.excerpt, body: article.body, cover_image_path: article.image || null, status: article.status, published_at: article.status === "published" ? new Date().toISOString() : null, updated_at: article.updatedAt });
  if (error) throw error;
  return true;
}
