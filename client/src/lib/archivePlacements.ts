import { getContentSetting, readCachedSetting, saveContentSetting, useContentSetting } from "./contentSettings";

export type ArchivePlacement = {
  spotlight: boolean;
  mustRead: boolean;
  latest: boolean;
  homeHero: boolean;
  homeFeature: boolean;
  homeSelection: boolean;
  order: number;
};

export type ArchivePlacements = Record<string, ArchivePlacement>;
export const archivePlacementsKey = "public:archive-placements";

const normalize = (value: unknown): ArchivePlacements => value && typeof value === "object" && !Array.isArray(value) ? value as ArchivePlacements : {};

/** Last known placements (instant, from cache). Use the hook for live data. */
export function getArchivePlacements(): ArchivePlacements { return normalize(readCachedSetting(archivePlacementsKey)); }
export async function fetchArchivePlacements(): Promise<ArchivePlacements> { return normalize(await getContentSetting<unknown>(archivePlacementsKey, {})); }
export function useArchivePlacements() { return useContentSetting<ArchivePlacements>(archivePlacementsKey, {}, normalize); }

/** Saves one article's placement. Only one article can hold the homepage Hero. */
export async function saveArchivePlacement(articleId: string, placement: ArchivePlacement): Promise<ArchivePlacements> {
  const current = await fetchArchivePlacements();
  const next: ArchivePlacements = {};
  Object.entries(current).forEach(([id, value]) => { next[id] = placement.homeHero && id !== articleId ? { ...value, homeHero: false } : value; });
  next[articleId] = placement;
  await saveContentSetting(archivePlacementsKey, next);
  return next;
}

export async function removeArchivePlacement(articleId: string) {
  const current = await fetchArchivePlacements();
  if (!(articleId in current)) return;
  const { [articleId]: _removed, ...rest } = current;
  await saveContentSetting(archivePlacementsKey, rest);
}
