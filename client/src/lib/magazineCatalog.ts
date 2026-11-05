import { editions, type MagazineEdition } from "@/lib/magazines";
import { getContentSetting, saveContentSetting } from "./contentSettings";

export function getMagazineEditions(): MagazineEdition[] {
  return [];
}

export async function fetchRemoteMagazineEditions(): Promise<MagazineEdition[]> {
  return getContentSetting<MagazineEdition[]>("magazine_editions", []);
}

export async function saveMagazineEditions(nextEditions: MagazineEdition[]) {
  await saveContentSetting("magazine_editions", nextEditions);
}

export function createMagazineEdition(): MagazineEdition {
  const number = "01";
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
    previewPages: [],
  };
}
