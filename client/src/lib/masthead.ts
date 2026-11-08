import { contentSettingEventName, getContentSetting, saveContentSetting } from "./contentSettings";

export type MastheadPerson = { id: string; name: string; image: string };
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

function normalizePerson(person: unknown, index: number, memberId: string): MastheadPerson | null {
  if (!person || typeof person !== "object") return null;
  const record = person as Record<string, unknown>;
  return {
    id: typeof record.id === "string" && record.id ? record.id : `${memberId}-person-${index + 1}`,
    name: typeof record.name === "string" ? record.name : "",
    image: typeof record.image === "string" ? record.image : "",
  };
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
      people = [{ id: `${id}-person-1`, name: typeof record.name === "string" ? record.name : "", image: typeof record.image === "string" ? record.image : "" }];
    }
    return { id, role, people };
  });
}

export async function fetchMastheadTeam(): Promise<MastheadMember[]> {
  return normalizeTeam(await getContentSetting<unknown>(settingKey, defaultMastheadTeam));
}

export async function saveMastheadTeam(members: MastheadMember[]): Promise<"remote" | "local"> {
  return saveContentSetting(settingKey, normalizeTeam(members));
}
