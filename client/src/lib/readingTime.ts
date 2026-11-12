import type { EditorialArticle } from "@/lib/editorial";

/**
 * Tiempo de lectura automático. Un artículo está en modo automático cuando su tiempo está vacío
 * o es el "8 min de lectura" que antes se ponía por defecto a todos; en ese caso se calcula con
 * las palabras y se guarda al guardar. Si alguien escribe otro texto, se respeta (modo manual).
 */
export const WORDS_PER_MINUTE = 220;
const LEGACY_DEFAULT = "8 min de lectura";

export function countArticleWords(article: Pick<EditorialArticle, "title" | "excerpt" | "lead" | "blocks">) {
  const text = [article.title, article.excerpt, article.lead, ...(article.blocks || []).filter((block) => ["paragraph", "heading", "quote"].includes(block.type)).map((block) => block.content)].join(" ");
  return (text.match(/[\p{L}\p{N}’']+/gu) || []).length;
}

export function readingMinutes(words: number) { return Math.max(1, Math.round(words / WORDS_PER_MINUTE)); }
export function formatReadingTime(minutes: number) { return `${minutes} min de lectura`; }
export function isAutoReadingTime(value: string | undefined | null) { const text = (value || "").trim(); return !text || text === LEGACY_DEFAULT; }

/** El texto que se guarda y se muestra: el manual si lo hay; si no, el calculado. */
export function resolveReadingTime(article: Pick<EditorialArticle, "title" | "excerpt" | "lead" | "blocks" | "readingTime">) {
  return isAutoReadingTime(article.readingTime) ? formatReadingTime(readingMinutes(countArticleWords(article))) : article.readingTime.trim();
}
