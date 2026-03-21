## MongoDB Collections

### `users`
- `email` (unique)
- `name`
- `image`
- `passwordHash` (optional for Google users)
- `provider` (`credentials` or `google`)
- timestamps

### `systems`
- `ownerUserId` (unique)
- `name`
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

### `frontsessions`
- `systemId` → `systems`
- `headmateIds[]` (co-front support)
- `startedAt`, `endedAt` (`null` = active session)
- `note` (optional)
- timestamps

### Planned Collections
- `journalEntries`
- `privacySettings`
