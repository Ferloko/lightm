export type ArchivePlacement = {
  spotlight: boolean;
  mustRead: boolean;
  latest: boolean;
  homeHero: boolean;
  homeFeature: boolean;
  homeSelection: boolean;
  order: number;
};
import { getContentSetting, saveContentSetting } from "./contentSettings";

export function getArchivePlacements(): Promise<Record<string, ArchivePlacement>> {
  return getContentSetting("archive_placements", {});
}

export async function saveArchivePlacement(articleId: string, placement: ArchivePlacement) {
  const next = { ...(await getArchivePlacements()), [articleId]: placement };
  await saveContentSetting("archive_placements", next);
}
