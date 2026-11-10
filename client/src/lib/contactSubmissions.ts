import { supabase } from "./supabase";

export type ContactSubmission = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  comment: string;
  createdAt: string;
};

export type NewContactSubmission = Omit<ContactSubmission, "id" | "createdAt">;

const localKey = "light.contact-submissions";
export const contactSubmissionsUpdatedEvent = "light:contact-submissions-updated";

function readLocal(): ContactSubmission[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(localKey) || "[]") as unknown;
    return Array.isArray(parsed) ? parsed as ContactSubmission[] : [];
  } catch {
    return [];
  }
}

function createId() {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `comment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function mapRow(row: Record<string, unknown>): ContactSubmission {
  return {
    id: String(row.id ?? createId()),
    firstName: String(row.first_name ?? ""),
    lastName: String(row.last_name ?? ""),
    email: String(row.email ?? ""),
    comment: String(row.comment ?? ""),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

export async function fetchContactSubmissions(): Promise<ContactSubmission[]> {
  if (!supabase) return readLocal().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const { data, error } = await supabase.from("contact_submissions").select("id, first_name, last_name, email, comment, created_at").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

export async function createContactSubmission(input: NewContactSubmission): Promise<ContactSubmission> {
  const item: ContactSubmission = { id: createId(), ...input, createdAt: new Date().toISOString() };
  if (supabase) {
    const { error } = await supabase.from("contact_submissions").insert({
      id: item.id,
      first_name: item.firstName,
      last_name: item.lastName,
      email: item.email,
      comment: item.comment,
    });
    if (error) throw error;
  } else {
    const items = readLocal();
    try { localStorage.setItem(localKey, JSON.stringify([item, ...items])); } catch (error) { throw new Error("No se pudo guardar el comentario en este navegador.", { cause: error }); }
  }
  window.dispatchEvent(new Event(contactSubmissionsUpdatedEvent));
  return item;
}

export async function deleteContactSubmission(id: string) {
  if (supabase) {
    const { error } = await supabase.from("contact_submissions").delete().eq("id", id);
    if (error) throw error;
    return;
  }
  try { localStorage.setItem(localKey, JSON.stringify(readLocal().filter((item) => item.id !== id))); } catch { /* demo only */ }
}
