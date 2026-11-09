import { supabase } from "@/lib/supabase";
import type { EditorialArticle } from "@/lib/editorial";

export type ArticleDeletionStatus = "pending" | "approved" | "rejected";
export type ArticleDeletionRequest = {
  id: string;
  articleId: string | null;
  articleTitle: string;
  articleSlug: string | null;
  requesterId: string;
  requesterName: string;
  requestNote: string;
  status: ArticleDeletionStatus;
  resolutionNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

const selection = "id,article_id,article_title,article_slug,requester_id,request_note,status,resolution_note,created_at,resolved_at,requester:profiles!article_deletion_requests_requester_id_fkey(display_name)";

function fromRow(row: Record<string, any>): ArticleDeletionRequest {
  const requester = Array.isArray(row.requester) ? row.requester[0] : row.requester;
  return {
    id: String(row.id), articleId: row.article_id ? String(row.article_id) : null,
    articleTitle: String(row.article_title || "Artículo eliminado"), articleSlug: row.article_slug ? String(row.article_slug) : null,
    requesterId: String(row.requester_id || ""), requesterName: String(requester?.display_name || "Staff Writer"),
    requestNote: String(row.request_note || ""), status: row.status as ArticleDeletionStatus,
    resolutionNote: row.resolution_note ? String(row.resolution_note) : null,
    createdAt: String(row.created_at), resolvedAt: row.resolved_at ? String(row.resolved_at) : null,
  };
}

export async function fetchArticleDeletionRequests(): Promise<ArticleDeletionRequest[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("article_deletion_requests").select(selection).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map((row) => fromRow(row as Record<string, any>));
}

export async function submitArticleDeletionRequest(article: Pick<EditorialArticle, "id" | "title" | "slug">, note: string): Promise<ArticleDeletionRequest> {
  if (!supabase) throw new Error("Las solicitudes de borrado requieren Supabase conectado.");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Inicia sesión para enviar una solicitud.");
  const { data, error } = await supabase.from("article_deletion_requests").insert({
    article_id: article.id, article_title: article.title, article_slug: article.slug || null,
    requester_id: user.id, request_note: note.trim(), status: "pending",
  }).select(selection).single();
  if (error) {
    if (error.code === "23505") throw new Error("Ya hay una solicitud pendiente para este borrador.");
    throw new Error(error.message);
  }
  return fromRow(data as Record<string, any>);
}

export async function resolveArticleDeletionRequest(requestId: string, resolutionNote: string, approve: boolean): Promise<void> {
  if (!supabase) throw new Error("Las solicitudes de borrado requieren Supabase conectado.");
  const { error } = await supabase.rpc("resolve_article_deletion_request", {
    p_request_id: requestId, p_resolution_note: resolutionNote.trim(), p_approve: approve,
  });
  if (error) throw new Error(error.message);
}
