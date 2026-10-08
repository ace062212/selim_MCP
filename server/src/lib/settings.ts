import type { Db } from '../db.js'

export type Settings = {
  allowedDomains: string[]
  selfIssue: boolean
  keyTtlDays: number | null
  rateLimitPerMin: number
  otpTtlMinutes: number
  otpMaxAttempts: number
  sessionTtlMinutes: number
  logRetentionDays: number
}

// DB settings 테이블의 key ↔ 코드의 이름
const KEYS: Record<keyof Settings, string> = {
  allowedDomains: 'allowed_domains',
  selfIssue: 'self_issue',
  keyTtlDays: 'key_ttl_days',
  rateLimitPerMin: 'rate_limit_per_min',
  otpTtlMinutes: 'otp_ttl_minutes',
  otpMaxAttempts: 'otp_max_attempts',
  sessionTtlMinutes: 'session_ttl_minutes',
  logRetentionDays: 'log_retention_days',
}

// seed가 빠졌을 때를 대비한 기본값 (sql/seed/001_default_settings.sql과 같게 유지)
const DEFAULTS: Settings = {
  allowedDomains: ['selim.kr'],
  selfIssue: true,
  keyTtlDays: null,
  rateLimitPerMin: 60,
  otpTtlMinutes: 3,
  otpMaxAttempts: 5,
  sessionTtlMinutes: 30,
  logRetentionDays: 365,
}

export async function getSettings(db: Db): Promise<Settings> {
  const { rows } = await db.query<{ key: string; value: unknown }>('SELECT key, value FROM settings')
  const byKey = new Map(rows.map((r) => [r.key, r.value]))
  const result = { ...DEFAULTS } as Record<string, unknown>
  for (const [name, key] of Object.entries(KEYS)) {
    if (byKey.has(key)) result[name] = byKey.get(key)
  }
  return result as Settings
}

export async function updateSettings(db: Db, patch: Partial<Settings>, updatedBy: string) {
  for (const [name, value] of Object.entries(patch)) {
    const key = KEYS[name as keyof Settings]
    if (!key || value === undefined) continue
    await db.query(
      `INSERT INTO settings (key, value, updated_by) VALUES ($1, $2::jsonb, $3)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by`,
      [key, JSON.stringify(value), updatedBy],
    )
  }
}
