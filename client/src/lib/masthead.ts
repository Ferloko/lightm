import { contentSettingEventName, getContentSetting, onContentSettingChange, saveContentSetting } from "./contentSettings";

export type MastheadFact = { label: string; value: string };
/** One person of the roster. Everything beyond name/image feeds their own page (/masthead/:slug). */
export type MastheadPerson = {
  id: string;
  name: string;
  image: string;
  slug: string;
  tagline: string;
  bio: string;
  location: string;
  agency: string;
  instagram: string;
  coverImage: string;
  gallery: string[];
  facts: MastheadFact[];
};
export type MastheadMember = { id: string; role: string; people: MastheadPerson[] };

export const defaultMastheadTeam: MastheadMember[] = [
  { id: "head-global-editorial", role: "Head of Global Editorial", people: [] },
  { id: "assistant-global-editorial", role: "Assistant Global Editorial", people: [] },
  { id: "cast-talent-director", role: "Cast & Talent Director", people: [] },
  { id: "senior-fashion-editor", role: "Senior Fashion Editor", people: [] },
  { id: "supermodel", role: "Supermodel", people: [] },
  { id: "runway-model", role: "Runway Model", people: [] },
  { id: "new-face-up", role: "New Face Up", people: [] },
  { id: "staff-writer", role: "Staff Writer", people: [] },
];

export const mastheadTeamEventName = contentSettingEventName();
const settingKey = "public:masthead-team";

const text = (value: unknown) => typeof value === "string" ? value : "";

export function slugifyName(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
}

export function emptyPersonDetails(): Omit<MastheadPerson, "id" | "name" | "image"> {
  return { slug: "", tagline: "", bio: "", location: "", agency: "", instagram: "", coverImage: "", gallery: [], facts: [] };
}

function normalizePerson(person: unknown, index: number, memberId: string): MastheadPerson | null {
  if (!person || typeof person !== "object") return null;
  const record = person as Record<string, unknown>;
  const id = typeof record.id === "string" && record.id ? record.id : `${memberId}-person-${index + 1}`;
  return {
    ...emptyPersonDetails(),
    id,
    name: text(record.name),
    image: text(record.image),
    slug: text(record.slug),
    tagline: text(record.tagline),
    bio: text(record.bio),
    location: text(record.location),
    agency: text(record.agency),
    instagram: text(record.instagram),
    coverImage: text(record.coverImage),
    gallery: Array.isArray(record.gallery) ? record.gallery.filter((item): item is string => typeof item === "string" && item.trim() !== "") : [],
    facts: Array.isArray(record.facts) ? record.facts.filter((fact): fact is MastheadFact => Boolean(fact) && typeof fact === "object" && typeof (fact as MastheadFact).label === "string" && typeof (fact as MastheadFact).value === "string") : [],
  };
}

/** Gives every named person a unique, stable URL slug. */
export function assignPersonSlugs(members: MastheadMember[]): MastheadMember[] {
  const used = new Set<string>();
  return members.map((member) => ({ ...member, people: member.people.map((person) => {
    const base = slugifyName(person.slug || person.name) || person.id.slice(0, 8);
    let slug = base; let counter = 2;
    while (used.has(slug)) { slug = `${base}-${counter}`; counter += 1; }
    used.add(slug);
    return { ...person, slug };
  }) }));
}

function normalizeTeam(value: unknown): MastheadMember[] {
  if (!Array.isArray(value)) return defaultMastheadTeam.map((member) => ({ ...member, people: [] }));
  return value.filter((member): member is Record<string, unknown> => Boolean(member) && typeof member === "object" && typeof (member as Record<string, unknown>).role === "string").map((record, index) => {
    const id = typeof record.id === "string" && record.id ? record.id : `masthead-${index + 1}`;
    const role = record.role as string;
    let people: MastheadPerson[] = [];
    if (Array.isArray(record.people)) {
      people = record.people.map((person, personIndex) => normalizePerson(person, personIndex, id)).filter((person): person is MastheadPerson => person !== null);
    } else if ((typeof record.name === "string" && record.name.trim()) || (typeof record.image === "string" && record.image.trim())) {
      // Preserve previously saved single-person entries when upgrading the roster shape.
      people = [{ ...emptyPersonDetails(), id: `${id}-person-1`, name: text(record.name), image: text(record.image) }];
    }
    return { id, role, people };
  });
}

export async function fetchMastheadTeam(): Promise<MastheadMember[]> {
  return assignPersonSlugs(normalizeTeam(await getContentSetting<unknown>(settingKey, defaultMastheadTeam)));
}

export async function saveMastheadTeam(members: MastheadMember[]): Promise<"remote" | "local"> {
  return saveContentSetting(settingKey, assignPersonSlugs(normalizeTeam(members)));
}

export function onMastheadChange(callback: () => void) { return onContentSettingChange(settingKey, callback); }

export function findMastheadPerson(team: MastheadMember[], slug: string): { member: MastheadMember; person: MastheadPerson; index: number } | null {
  for (const member of team) {
    const index = member.people.findIndex((person) => person.slug === slug);
    if (index >= 0) return { member, person: member.people[index], index };
  }
  return null;
}
