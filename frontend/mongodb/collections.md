## MongoDB Collections

### `users`
- `email` (unique)
- `name` — account display name (signup); kept in sync with `systems.name` (display base) when the system profile is edited
- `image`
- `passwordHash` (optional for Google users)
- `provider` (`credentials` or `google`)
- timestamps

### `systems`
- `ownerUserId` (unique)
- `name` — short **display base** (e.g. account first name); the UI shows `{name}'s System`. Older rows may still store the legacy full string `"{name}'s System"`; APIs normalize with `getSystemNameBase`.
- `username` (unique)
- `description`
- `iconUrl`
- `headmateTemplates[]` — `{ name, fieldLabels[] }` subdocs (label-only presets for new headmates)
- `defaultHeadmateTemplateId` — optional ObjectId pointing at one subdoc’s `_id`
- timestamps

### `headmates`
- `systemId` → `systems`
- `name`, `pronouns`, `description`, `customFields` (ordered array of `{ key, value }`; legacy plain objects are normalized on read), `iconUrl`
- `privacyLevel` (optional; reserved for a future privacy feature — not exposed in the API/UI yet)
- timestamps

### `frontsessions` (legacy)
- `systemId` → `systems`
- `headmateIds[]` (co-front support)
- `startedAt`, `endedAt` (`null` = active session)
- `note` (optional)
- timestamps
- On first use per system, data is copied into `headmatefrontintervals` (one row per headmate per segment, plus empty-front rows with `headmateId: null`). New writes use intervals only.

### `headmatefrontintervals` (Mongoose model `HeadmateFrontInterval`)
- `systemId` → `systems`
- `headmateId` → `headmates` (optional; `null` = “no one fronting” segment)
- `startedAt`, `endedAt` (`null` = still fronting for that headmate / empty-front slot)
- `note` (optional string)
- timestamps
- Co-fronting = multiple rows with the same `startedAt`/`endedAt`/`note`.
- **Analytics** (`GET /api/front/analytics`): reads overlapping intervals in a time window and returns computed stats (no extra collection).

### `journalentries` (Mongoose model `JournalEntry`)
- `systemId` → `systems`
- `title` (short label; filter/search on client; legacy rows may be empty → shown as “Untitled”)
- `content` (entry body)
- `headmateIds[]` → `headmates` (optional; authors / co-authors)
- timestamps

### Planned Collections
- `privacySettings`
