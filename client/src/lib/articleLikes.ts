import { supabase } from "@/lib/supabase";

export type ArticleLikeState = { liked: boolean; count: number };

const VISITOR_KEY = "light.article-likes.visitor";
const LOCAL_LIKES_KEY = "light.article-likes.entries";

function createUuid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === "x" ? random : (random & 0x3) | 0x8).toString(16);
  });
}

function getVisitorId() {
  try {
    const saved = localStorage.getItem(VISITOR_KEY);
    if (saved) return saved;
    const created = createUuid();
    localStorage.setItem(VISITOR_KEY, created);
    return created;
  } catch {
    return createUuid();
  }
}

function readLocalLikes(): Record<string, string[]> {
  try {
    const value = JSON.parse(localStorage.getItem(LOCAL_LIKES_KEY) || "{}");
    return value && typeof value === "object" ? value as Record<string, string[]> : {};
  } catch {
    return {};
  }
}

function fromRpc(value: unknown): ArticleLikeState {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object") return { liked: false, count: 0 };
  const result = row as Record<string, unknown>;
  return { liked: result.liked === true, count: Math.max(0, Number(result.like_count) || 0) };
}

export async function fetchArticleLikeState(articleKey: string): Promise<ArticleLikeState> {
  const voterId = getVisitorId();
  if (supabase) {
    const { data, error } = await supabase.rpc("get_article_like_state", { p_article_key: articleKey, p_voter_id: voterId });
    if (error) throw new Error(error.message);
    return fromRpc(data);
  }
  const ids = readLocalLikes()[articleKey] || [];
  return { liked: ids.includes(voterId), count: ids.length };
}

export async function setArticleLiked(articleKey: string, liked: boolean): Promise<ArticleLikeState> {
  const voterId = getVisitorId();
  if (supabase) {
    const { data, error } = await supabase.rpc("set_article_like", { p_article_key: articleKey, p_voter_id: voterId, p_liked: liked });
    if (error) throw new Error(error.message);
    return fromRpc(data);
  }
  const entries = readLocalLikes();
  const voters = new Set(entries[articleKey] || []);
  if (liked) voters.add(voterId);
  else voters.delete(voterId);
  entries[articleKey] = [...voters];
  try {
    localStorage.setItem(LOCAL_LIKES_KEY, JSON.stringify(entries));
  } catch {
    throw new Error("No se pudo guardar el like en este navegador.");
  }
  return { liked: voters.has(voterId), count: voters.size };
}
