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

### Planned Collections
- `headmates`
- `frontSessions`
- `journalEntries`
- `privacySettings`
