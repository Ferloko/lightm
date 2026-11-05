import { editions, type MagazineEdition } from "@/lib/magazines";

const MAGAZINE_KEY = "light.magazine.editions";

export function getMagazineEditions(): MagazineEdition[] {
  try {
    const stored = JSON.parse(localStorage.getItem(MAGAZINE_KEY) || "null");
    if (Array.isArray(stored) && stored.length) {
      return (stored as MagazineEdition[]).map((edition) => {
        const defaults = editions.find((item) => item.number === edition.number)?.previewPages || editions[0].previewPages;
        const previewPages = edition.previewPages.length >= 12 ? edition.previewPages : [...edition.previewPages, ...defaults.slice(edition.previewPages.length, 12)];
        return { ...edition, coverImage: edition.number === "01" ? editions[0].coverImage : edition.coverImage, previewPages };
      });
    }
    return editions;
  } catch {
    return editions;
  }
}

export function saveMagazineEditions(nextEditions: MagazineEdition[]) {
  localStorage.setItem(MAGAZINE_KEY, JSON.stringify(nextEditions));
  window.dispatchEvent(new StorageEvent("storage", { key: MAGAZINE_KEY, newValue: JSON.stringify(nextEditions) }));
}

export function createMagazineEdition(): MagazineEdition {
  const number = String(getMagazineEditions().length + 1).padStart(2, "0");
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
    previewPages,
  };
}
