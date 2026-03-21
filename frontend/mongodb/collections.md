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
- timestamps

### `headmates`
- `systemId` → `systems`
- `name`, `pronouns`, `description`, `customFields`, `privacyLevel`, `iconUrl`
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
