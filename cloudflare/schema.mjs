// Idempotent first-run schema. This creates empty tables; it never imports local user data.
import { USAGE_SCHEMA } from '../web/usage.js';
import { PROFILE_SCHEMA } from '../web/profile.js';
import { ACCOUNT_SCHEMA } from '../web/accounts-backend.mjs';
export const schema = [
  ...ACCOUNT_SCHEMA,
  `CREATE TABLE IF NOT EXISTS participants (
    id TEXT PRIMARY KEY, token_hash TEXT NOT NULL, source TEXT NOT NULL,
    consent_version TEXT NOT NULL, consented_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    revision INTEGER NOT NULL DEFAULT 0, deleted INTEGER NOT NULL DEFAULT 0,
    upload_id TEXT NOT NULL DEFAULT '')`,
  `CREATE TABLE IF NOT EXISTS daily (
    participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    day TEXT NOT NULL, break_count INTEGER NOT NULL, rest_seconds INTEGER NOT NULL,
    outdoor INTEGER NOT NULL, PRIMARY KEY(participant_id, day))`,
  PROFILE_SCHEMA,
  USAGE_SCHEMA,
  'CREATE INDEX IF NOT EXISTS daily_day ON daily(day)',
  'CREATE TABLE IF NOT EXISTS admin_sessions (token_hash TEXT PRIMARY KEY, expires INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS admin_transfers (token_hash TEXT PRIMARY KEY, expires INTEGER NOT NULL)',
  'CREATE INDEX IF NOT EXISTS sessions_expiry ON admin_sessions(expires)',
  'CREATE TABLE IF NOT EXISTS request_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL)',
  'CREATE INDEX IF NOT EXISTS limits_expiry ON request_limits(expires)'
];
const ready = new WeakMap();
export async function ensureSchema(db) {
  if (!ready.has(db)) ready.set(db, db.batch(schema.map(sql => db.prepare(sql))).catch(error => { ready.delete(db); throw error; }));
  await ready.get(db);
}
