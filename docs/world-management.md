# Unity Gardens world management

Continue, preserve, restart and restore the persistent Unity Gardens society
without ever overwriting a saved world or touching spending history.

## Operations

All commands stop unless the backend is fully stopped. They refuse to run while
`runtime/neighbourhood-session.lock`, any checkpoint `.pending` file, or any
spending-ledger lock/pending file exists.

- **Continue Society** — start the backend normally; it loads the existing
  authoritative world with its full history:
  `npm run dev:live` (Muse) or `npm run backend` (mock).
- **Archive the current society** — copy the live checkpoint plus every
  `neighbourhood-session.json.*` sidecar backup into a new verified archive.
  Live files stay in place:
  `npm run world -- archive`
- **Start New Society** — preserve the current world as a recoverable archive,
  then remove the live checkpoint and sidecars so the next backend start
  creates a fresh sixteen-resident Unity Gardens world with its own identity:
  `npm run world -- new --confirm=<live session id>`
  Read the live session id from the `archive` output or `list`. When no
  checkpoint exists (only orphaned sidecars), use `--confirm=fresh-start`.
- **Restore Society** — verify an archive byte-for-byte, preserve whatever is
  currently live as a new archive, then restore the archived world:
  `npm run world -- restore --archive=<id> --confirm=<id>`
- **List archived societies**:
  `npm run world -- list`

`--runtime=<dir>` (default `runtime`) overrides the runtime directory, mainly
for tests. `--checkpoint=<name>` overrides the checkpoint file name.

## Safeguards

- Archives live under `runtime/recovery-archive/<timestamp>-<session>-<rand>/`
  with a `manifest.json` recording session id, world id, resident count,
  simulation seconds, interruption count and a SHA-256 per file. Every copy is
  verified by readback; restores re-verify before touching live files.
- Archive directories are created exclusively and never overwritten. Restoring
  always preserves the outgoing live world first, so rollback is one more
  `restore` away. Directories under `recovery-archive/` without a manifest
  (manual recovery material from earlier work) are left untouched and skipped
  by `list`; only manifested archives can be restored.
- Spending ledgers (`meta-probe-budget.json`, `muse-usage.json`), the local
  policy, approved plans, claims and access files are never archived, moved,
  reset or modified by these commands.
- One backend process owns one world. Phone leases, pending decisions, session
  epochs and proposals are in-memory only and cannot leak between worlds;
  persisted interruptions travel inside their own archive and force the backend
  to start paused for manual review.
- Destructive commands require typing the exact live session id or archive id.
  There is no unsafe reset button: `new` without a successful verified archive
  removes nothing.
