import type { Db } from '../db.js'
import { KEY_PREFIX, generateApiKey, maskKey, sha256 } from '../lib/crypto.js'
import { getSettings } from '../lib/settings.js'

export type KeyInfo = {
  id: number
  masked: string
  status: 'active' | 'suspended'
  issuedAt: Date
  expiresAt: Date | null
  lastUsedAt: Date | null
}

const KEY_COLUMNS = `id, key_prefix, key_last4, status, issued_at, expires_at, last_used_at`

type KeyRow = {
  id: number
  key_prefix: string
  key_last4: string
  status: 'active' | 'suspended'
  issued_at: Date
  expires_at: Date | null
  last_used_at: Date | null
}

const toInfo = (r: KeyRow): KeyInfo => ({
  id: r.id,
  masked: maskKey(r.key_prefix, r.key_last4),
  status: r.status,
  issuedAt: r.issued_at,
  expiresAt: r.expires_at,
  lastUsedAt: r.last_used_at,
})

// 사용자의 살아있는(정지 포함) 키. 없으면 null
export async function getLiveKey(db: Db, userId: number): Promise<KeyInfo | null> {
  const { rows } = await db.query<KeyRow>(`SELECT ${KEY_COLUMNS} FROM api_keys WHERE user_id = $1 AND status <> 'revoked'`, [userId])
  return rows[0] ? toInfo(rows[0]) : null
}

// 새 키 발급. 기존 키가 있으면 폐기 처리 (트랜잭션 안에서 호출할 것)
// 원문은 이 반환값으로 한 번만 전달되고 DB에는 해시만 남음
export async function issueKey(db: Db, userId: number, issuedBy: 'self' | 'admin') {
  const { keyTtlDays } = await getSettings(db)
  const revoked = await db.query(
    `UPDATE api_keys SET status = 'revoked', revoked_at = now() WHERE user_id = $1 AND status <> 'revoked'`,
    [userId],
  )
  const key = generateApiKey()
  const { rows } = await db.query<KeyRow>(
    `INSERT INTO api_keys (user_id, key_hash, key_prefix, key_last4, issued_by, expires_at)
     VALUES ($1, $2, $3, $4, $5, CASE WHEN $6::int IS NULL THEN NULL ELSE now() + make_interval(days => $6::int) END)
     RETURNING ${KEY_COLUMNS}`,
    [userId, sha256(key), key.slice(0, KEY_PREFIX.length + 4), key.slice(-4), issuedBy, keyTtlDays],
  )
  return { key, info: toInfo(rows[0]), replaced: (revoked.rowCount ?? 0) > 0 }
}

export type KeyAuth = { keyId: number; userId: number; email: string }
export type KeyAuthFailure = 'missing' | 'invalid' | 'suspended' | 'expired'

export async function authenticateKey(db: Db, rawKey: string | undefined): Promise<KeyAuth | KeyAuthFailure> {
  if (!rawKey) return 'missing'
  const { rows } = await db.query<{ id: number; user_id: number; email: string; status: string; expired: boolean }>(
    `SELECT k.id, k.user_id, u.email, k.status, (k.expires_at IS NOT NULL AND k.expires_at < now()) AS expired
       FROM api_keys k JOIN users u ON u.id = k.user_id
      WHERE k.key_hash = $1`,
    [sha256(rawKey)],
  )
  const k = rows[0]
  if (!k || k.status === 'revoked') return 'invalid'
  if (k.status === 'suspended') return 'suspended'
  if (k.expired) return 'expired'
  return { keyId: k.id, userId: k.user_id, email: k.email }
}

// 매 요청마다 쓰지 않도록 1분에 한 번만 갱신
export async function touchKey(db: Db, keyId: number) {
  await db.query(
    `UPDATE api_keys SET last_used_at = now()
      WHERE id = $1 AND (last_used_at IS NULL OR last_used_at < now() - interval '1 minute')`,
    [keyId],
  )
}
