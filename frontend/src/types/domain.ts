export type PrivacyLevel =
  | "public"
  | "friends_only"
  | "trusted_friends_only"
  | "private";

export type SystemProfile = {
  id: string;
  name: string;
  username: string;
  description: string;
  iconUrl?: string;
};

export type Headmate = {
  id: string;
  systemId: string;
  name: string;
  pronouns: string;
  description: string;
  customFields: Record<string, string>;
  privacyLevel: PrivacyLevel;
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
  content: string;
  createdAt: string;
  headmateIds: string[];
  privacyLevel: PrivacyLevel;
};
