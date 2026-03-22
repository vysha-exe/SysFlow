# Journal hash anchoring (Solana)

SysFlow can optionally record a **SHA-256 fingerprint** of a journal entry on **Solana** using the **Memo** program. The **full entry text stays in MongoDB**; only a short memo (`sysflow:v1:<64-char hex>`) is written on chain.

## Why

- **Independent timestamp / commitment** (third parties can verify `hash(entry) === memo` if they obtain the same canonical JSON).
- **Not** a backup: if the database is lost, the hash alone cannot recover text.

## Configuration (server)

Set in **Vercel** / `.env.local` (never commit real keys):

| Variable | Notes |
|----------|--------|
| `SOLANA_ANCHOR_SECRET_KEY` | **Required** for anchoring. Base64 of the **64-byte** secret key (full keypair). |
| `SOLANA_CLUSTER` | Optional. `devnet` (default), `testnet`, or `mainnet-beta`. |
| `SOLANA_RPC_URL` | Optional. Override RPC endpoint (defaults per cluster). |

### Devnet keypair & SOL

1. `solana-keygen new -o anchor.json`
2. Base64 the file bytes for `SOLANA_ANCHOR_SECRET_KEY` (or use a small script to read `anchor.json` array and output base64).
3. `solana airdrop 2 $(solana-keygen pubkey anchor.json) --url devnet`

## Canonical hash

`SHA-256(UTF-8 JSON))` with fields:

`v`, `entryId`, `systemId`, `title`, `content`, `headmateIds` (sorted), `updatedAt` (ISO).

Changing the entry **clears** the stored anchor (`PATCH`); the user can anchor again.

## API

- `POST /api/journal/:id/anchor` — authenticated; submits memo tx; returns updated entry.
