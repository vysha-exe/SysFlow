export type SystemProfile = {
  id: string;
  name: string;
  username: string;
  description: string;
  iconUrl?: string;
};

import type { CustomFieldEntry } from "@/lib/custom-fields";

export type { CustomFieldEntry };

export type Headmate = {
  id: string;
  systemId: string;
  name: string;
  pronouns: string;
  description: string;
  /** Ordered; may include empty drafts (shown only in editor). */
  customFields: CustomFieldEntry[];
};

export type FrontSession = {
  id: string;
  systemId: string;
  headmateIds: string[];
  startedAt: string;
  endedAt?: string;
  note?: string;
};

export type JournalEntry = {
  id: string;
  systemId: string;
  title: string;
  content: string;
  createdAt: string;
  headmateIds: string[];
};
