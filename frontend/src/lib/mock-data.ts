import type { FrontSession, Headmate, SystemProfile } from "@/types/domain";

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
    description: "",
    customFields: [
      { key: "role", value: "organizer" },
      { key: "energy", value: "steady" },
    ],
  },
  {
    id: "h_2",
    systemId: "sys_1",
    name: "River",
    pronouns: "she/they",
    description: "",
    customFields: [
      { key: "role", value: "social" },
      { key: "notes", value: "likes journaling" },
    ],
  },
  {
    id: "h_3",
    systemId: "sys_1",
    name: "Kai",
    pronouns: "he/him",
    description: "",
    customFields: [{ key: "role", value: "protector" }],
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
