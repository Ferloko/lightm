export type ArchivePlacement = {
  spotlight: boolean;
  mustRead: boolean;
  latest: boolean;
<<<<<<< HEAD
=======
  homeHero: boolean;
  homeFeature: boolean;
  homeSelection: boolean;
>>>>>>> 262872a606f138ec3ba64c08b614496d59e84fc6
  order: number;
};

const PLACEMENTS_KEY = "light.archive.placements";

export function getArchivePlacements(): Record<string, ArchivePlacement> {
  try {
    return JSON.parse(localStorage.getItem(PLACEMENTS_KEY) || "{}") as Record<string, ArchivePlacement>;
  } catch {
    return {};
  }
}

export function saveArchivePlacement(articleId: string, placement: ArchivePlacement) {
  const next = { ...getArchivePlacements(), [articleId]: placement };
  localStorage.setItem(PLACEMENTS_KEY, JSON.stringify(next));
  window.dispatchEvent(new StorageEvent("storage", { key: PLACEMENTS_KEY, newValue: JSON.stringify(next) }));
}
