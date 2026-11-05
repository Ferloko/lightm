import { supabase } from "@/lib/supabase";

export type NewsletterSubscriber = { id: string; email: string; subscribedAt: string; source: string };

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function subscribeToNewsletter(email: string) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return { ok: false, duplicate: false, remote: false };

  if (!supabase) return { ok: false, duplicate: false, remote: false };
  const { error } = await supabase.from("newsletter_subscribers").insert({ email: normalizedEmail, source: "home" });
  if (!error) return { ok: true, duplicate: false, remote: true };
  if (error.code === "23505") return { ok: true, duplicate: true, remote: true };
  return { ok: false, duplicate: false, remote: true };
}

export async function fetchNewsletterSubscriberCount() {
  if (!supabase) return 0;
  const { count, error } = await supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true });
  if (error) throw error;
  return typeof count === "number" ? count : 0;
}

export async function fetchNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("newsletter_subscribers").select("id,email,source,subscribed_at").order("subscribed_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => ({ id: String(row.id), email: String(row.email), source: String(row.source || "home"), subscribedAt: String(row.subscribed_at) }));
}
