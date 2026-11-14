import { isDemoMode, supabase } from "@/lib/supabase";

const LOCAL_KEY = "light_newsletter_subscribers";

export type NewsletterSubscriber = { id: string; email: string; subscribedAt: string; source: string };
type LocalSubscriber = Omit<NewsletterSubscriber, "id" | "source">;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getLocalSubscribers(): LocalSubscriber[] {
  try {
    const value = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
    return Array.isArray(value) ? value.filter((item): item is LocalSubscriber => Boolean(item?.email)) : [];
  } catch {
    return [];
  }
}

export async function subscribeToNewsletter(email: string, source = "home") {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return { ok: false, duplicate: false, remote: false };

  if (supabase) {
    const { error } = await supabase.from("newsletter_subscribers").insert({ email: normalizedEmail, source });
    if (!error) return { ok: true, duplicate: false, remote: true };
    if (error.code === "23505") return { ok: true, duplicate: true, remote: true };
    // Never pretend the subscription worked: the visitor must know it failed.
    console.warn("[LIGHT] Supabase newsletter unavailable", error.message);
    return { ok: false, duplicate: false, remote: true };
  }
  if (!isDemoMode) return { ok: false, duplicate: false, remote: false };

  const subscribers = getLocalSubscribers();
  const duplicate = subscribers.some((subscriber) => subscriber.email === normalizedEmail);
  if (!duplicate) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify([...subscribers, { email: normalizedEmail, subscribedAt: new Date().toISOString() }]));
  }
  return { ok: true, duplicate, remote: false };
}

export async function fetchNewsletterSubscriberCount() {
  if (supabase) {
    const { count, error } = await supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true });
    if (!error && typeof count === "number") return count;
    console.warn("[LIGHT] Could not read newsletter subscriber count", error?.message);
    return 0;
  }
  return getLocalSubscribers().length;
}

export async function fetchNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
  if (supabase) {
    const { data, error } = await supabase.from("newsletter_subscribers").select("id,email,source,subscribed_at").order("subscribed_at", { ascending: false });
    if (error) throw error;
    return (data || []).map((row) => ({ id: String(row.id), email: String(row.email), source: String(row.source || "home"), subscribedAt: String(row.subscribed_at) }));
  }
  return getLocalSubscribers().map((subscriber, index) => ({ id: `local-${index}-${subscriber.email}`, email: subscriber.email, source: "home", subscribedAt: subscriber.subscribedAt }));
}

export async function deleteNewsletterSubscriber(id: string) {
  if (!supabase) return;
  const { error } = await supabase.from("newsletter_subscribers").delete().eq("id", id);
  if (error) throw error;
}
