import { editions, type MagazineEdition } from "@/lib/magazines";
import { getContentSetting, readCachedSetting, saveContentSetting, useContentSetting } from "./contentSettings";

export const magazineEditionsKey = "public:magazine-editions";

function normalizeEditions(value: unknown): MagazineEdition[] {
  if (!Array.isArray(value) || !value.length) return editions;
  return (value as MagazineEdition[]).filter((edition) => edition && typeof edition.number === "string").map((edition) => {
    const defaults = editions.find((item) => item.number === edition.number)?.previewPages || editions[0].previewPages;
    const pages = Array.isArray(edition.previewPages) ? edition.previewPages : [];
    const previewPages = pages.length >= 12 ? pages : [...pages, ...defaults.slice(pages.length, 12)];
    return { ...edition, coverImage: edition.coverImage || (edition.number === "01" ? editions[0].coverImage : ""), previewPages };
  }).sort((a, b) => a.number.localeCompare(b.number));
}

/** Last known catalogue (instant, from cache). Use the hook on pages for live data. */
export function getMagazineEditions(): MagazineEdition[] { return normalizeEditions(readCachedSetting(magazineEditionsKey)); }
export async function fetchMagazineEditions(): Promise<MagazineEdition[]> { return normalizeEditions(await getContentSetting<unknown>(magazineEditionsKey, editions)); }
export function useMagazineEditions() { return useContentSetting<MagazineEdition[]>(magazineEditionsKey, editions, normalizeEditions); }

export async function saveMagazineEditions(nextEditions: MagazineEdition[]) {
  return saveContentSetting(magazineEditionsKey, [...nextEditions].sort((a, b) => a.number.localeCompare(b.number)));
}

export function createMagazineEdition(existing: MagazineEdition[] = getMagazineEditions()): MagazineEdition {
  const highest = existing.reduce((max, edition) => Math.max(max, Number.parseInt(edition.number, 10) || 0), 0);
  const number = String(highest + 1).padStart(2, "0");
  const previewPages: MagazineEdition["previewPages"] = Array.from({ length: 12 }, (_, index) => ({
    label: `${String(index + 1).padStart(2, "0")} / Página`,
    title: "",
    text: "",
    image: "",
  }));
  return {
    number,
    title: "Nueva edición",
    date: "Edición próxima",
    src: "",
    iframe: "",
    tone: "light",
    dek: "Una nueva conversación de estilo, imagen y cultura.",
    coverKicker: `LIGHT / EDICIÓN ${number}`,
    coverTitle: "Nueva mirada",
    coverNote: "Moda · Belleza · Ideas",
    coverImage: "",
    heroImage: "",
    heroPosition: "center",
    previewPages,
  };
}
