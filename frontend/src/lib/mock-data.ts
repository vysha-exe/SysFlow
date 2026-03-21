import type {
  FrontSession,
  Headmate,
  JournalEntry,
  SystemProfile,
} from "@/types/domain";

export const systemProfile: SystemProfile = {
  id: "sys_1",
  name: "SysFlow Demo System",
  username: "sysflow_demo",
  description: "Privacy-first DID/OSDD system management MVP.",
};

export const headmates: Headmate[] = [
  {
    id: "h_1",
    systemId: "sys_1",
    name: "Alex",
    pronouns: "they/them",
    description: "Grounded and focused during planning tasks.",
    customFields: { role: "organizer", energy: "steady" },
    privacyLevel: "friends_only",
  },
  {
    id: "h_2",
    systemId: "sys_1",
    name: "River",
    pronouns: "she/they",
    description: "Creative and social, often fronts in evenings.",
    customFields: { role: "social", notes: "likes journaling" },
    privacyLevel: "trusted_friends_only",
  },
  {
    id: "h_3",
    systemId: "sys_1",
    name: "Kai",
    pronouns: "he/him",
    description: "Protective and quick to assess risk.",
    customFields: { role: "protector" },
    privacyLevel: "private",
  },
];

const now = new Date();
const minutesAgo = (minutes: number) =>
  new Date(now.getTime() - minutes * 60 * 1000).toISOString();
const hoursAgo = (hours: number) =>
  new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();

export const frontSessions: FrontSession[] = [
  {
    id: "fs_1",
    systemId: "sys_1",
    headmateIds: ["h_1"],
    startedAt: minutesAgo(42),
  },
  {
    id: "fs_2",
    systemId: "sys_1",
    headmateIds: ["h_2", "h_3"],
    startedAt: hoursAgo(5),
    endedAt: hoursAgo(2),
    note: "Co-front during a stressful event.",
  },
  {
    id: "fs_3",
    systemId: "sys_1",
    headmateIds: ["h_2"],
    startedAt: hoursAgo(27),
    endedAt: hoursAgo(25),
  },
];

export const journalEntries: JournalEntry[] = [
  {
    id: "j_1",
    systemId: "sys_1",
    content: "Morning check-in: stable mood, goals are clear.",
    createdAt: minutesAgo(15),
    headmateIds: ["h_1"],
    privacyLevel: "private",
  },
  {
    id: "j_2",
    systemId: "sys_1",
    content: "Shared reflection after therapy session.",
    createdAt: hoursAgo(8),
    headmateIds: ["h_2", "h_3"],
    privacyLevel: "trusted_friends_only",
  },
];
