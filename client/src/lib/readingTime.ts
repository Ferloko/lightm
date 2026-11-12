import type { EditorialArticle } from "@/lib/editorial";

/**
 * Tiempo de lectura automático. Cada artículo guarda si su tiempo es automático (reading_time_auto):
 * en ese caso se recalcula con las palabras en cada guardado; si alguien lo escribe a mano, se respeta.
 */
export const WORDS_PER_MINUTE = 220;
const LEGACY_DEFAULT = "8 min de lectura";

export function countArticleWords(article: Pick<EditorialArticle, "title" | "excerpt" | "lead" | "blocks">) {
  const text = [article.title, article.excerpt, article.lead, ...(article.blocks || []).filter((block) => ["paragraph", "heading", "quote"].includes(block.type)).map((block) => block.content)].join(" ");
  return (text.match(/[\p{L}\p{N}’']+/gu) || []).length;
}

export function readingMinutes(words: number) { return Math.max(1, Math.round(words / WORDS_PER_MINUTE)); }
export function formatReadingTime(minutes: number) { return `${minutes} min de lectura`; }
/** Automático salvo que el artículo se marcara como manual (texto escrito a mano). */
export function isAutoReadingTime(article: Pick<EditorialArticle, "readingTime" | "readingTimeAuto">) {
  if (article.readingTimeAuto !== undefined) return article.readingTimeAuto;
  const text = (article.readingTime || "").trim();
  return !text || text === LEGACY_DEFAULT; // base de datos sin la migración 20261116
}

/** El texto que se guarda y se muestra: el manual si lo hay; si no, el calculado. */
export function resolveReadingTime(article: Pick<EditorialArticle, "title" | "excerpt" | "lead" | "blocks" | "readingTime" | "readingTimeAuto">) {
  return isAutoReadingTime(article) ? formatReadingTime(readingMinutes(countArticleWords(article))) : (article.readingTime.trim() || formatReadingTime(readingMinutes(countArticleWords(article))));
}
