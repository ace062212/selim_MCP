import { Router, type Response } from 'express'
import { z } from 'zod'
import { pool, tx } from '../db.js'
import { audit } from '../lib/audit.js'
import { maskKey } from '../lib/crypto.js'
import { HttpError } from '../lib/http.js'
import { requireSession, sessionOf } from '../lib/session.js'
import { getSettings, updateSettings } from '../lib/settings.js'
import { issueKey } from '../services/keys.js'
import { isAdmin, normalizeEmail, upsertUser } from '../services/users.js'

export const adminRouter = Router()

// 관리자 세션 + 지금도 admins 테이블에 있는지 (관리자에서 빠지면 즉시 차단)
adminRouter.use(requireSession('admin'), async (_req, res, next) => {
  if (!(await isAdmin(pool, sessionOf(res).email))) throw new HttpError(403, 'NOT_ADMIN', '관리자 권한이 없어요.')
  next()
})

const actor = (res: Response) => ({ actorType: 'admin' as const, actorEmail: sessionOf(res).email })
const idParam = (v: unknown) => z.coerce.number().int().positive().parse(v)
const LAST_7D = `called_at > now() - interval '7 days'`

// ── 대시보드 ──────────────────────────────────────────────

adminRouter.get('/stats', async (_req, res) => {
  const [keys, daily, summary, topTools, clients] = await Promise.all([
    pool.query(
      `SELECT count(*) FILTER (WHERE status = 'active')::int AS active,
              count(*) FILTER (WHERE status = 'suspended')::int AS suspended,
              count(*)::int AS total
         FROM api_keys WHERE status <> 'revoked'`,
    ),
    // 최근 14일 (한국 시간 기준 날짜별), 호출이 없는 날은 0
    pool.query(
      `SELECT to_char(d, 'FMMM/FMDD') AS label, COALESCE(x.n, 0)::int AS value
         FROM generate_series((now() AT TIME ZONE 'Asia/Seoul')::date - 13, (now() AT TIME ZONE 'Asia/Seoul')::date, interval '1 day') AS d
         LEFT JOIN (
           SELECT (called_at AT TIME ZONE 'Asia/Seoul')::date AS day, count(*) AS n
             FROM call_logs WHERE called_at > now() - interval '15 days' GROUP BY 1
         ) x ON x.day = d::date
        ORDER BY d`,
    ),
    pool.query(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE status >= 400)::int AS errors,
              COALESCE(round(avg(latency_ms) FILTER (WHERE status = 200)), 0)::int AS "avgLatency"
         FROM call_logs WHERE ${LAST_7D}`,
    ),
    pool.query(`SELECT tool_name AS name, count(*)::int AS calls FROM call_logs WHERE ${LAST_7D} GROUP BY 1 ORDER BY 2 DESC LIMIT 5`),
    pool.query(`SELECT COALESCE(client, '기타') AS name, count(*)::int AS calls FROM call_logs WHERE ${LAST_7D} GROUP BY 1 ORDER BY 2 DESC`),
  ])
  const s = summary.rows[0]
  res.json({
    keys: keys.rows[0],
    daily: daily.rows,
    avgLatency: s.avgLatency,
    errorRate: s.total ? Math.round((s.errors / s.total) * 1000) / 10 : 0,
    topTools: topTools.rows,
    clients: clients.rows,
  })
})

adminRouter.get('/activity', async (req, res) => {
  const limit = z.coerce.number().int().min(1).max(100).default(20).parse(req.query.limit)
  const { rows } = await pool.query(
    `SELECT id, occurred_at AS at, actor_type AS "actorType", actor_email AS "actorEmail", action,
            target_type AS "targetType", target_id AS "targetId", detail
       FROM audit_logs ORDER BY occurred_at DESC LIMIT $1`,
    [limit],
  )
  res.json(rows)
})

// ── API 키 ───────────────────────────────────────────────

adminRouter.get('/keys', async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT k.id, u.email, u.name, u.dept, k.key_prefix, k.key_last4, k.status, k.issued_by AS "issuedBy",
            k.issued_at AS "issuedAt", k.expires_at AS "expiresAt", k.last_used_at AS "lastUsedAt",
            (SELECT count(*) FROM call_logs c WHERE c.user_id = u.id AND c.called_at > now() - interval '30 days')::int AS requests
       FROM api_keys k JOIN users u ON u.id = k.user_id
      WHERE k.status <> 'revoked'
      ORDER BY k.issued_at DESC`,
  )
  res.json(rows.map(({ key_prefix, key_last4, ...r }) => ({ ...r, masked: maskKey(key_prefix, key_last4) })))
})

// 관리자 직접 발급 (이메일 인증 없이). 원문은 이 응답에서 한 번만
adminRouter.post('/keys', async (req, res) => {
  const { email } = z.object({ email: z.string().trim().email().transform(normalizeEmail) }).parse(req.body)
  const result = await tx(async (db) => {
    const userId = await upsertUser(db, email)
    const r = await issueKey(db, userId, 'admin')
    await audit(db, { ...actor(res), action: r.replaced ? 'key.reissue' : 'key.issue', targetType: 'user', targetId: email })
    return r
  })
  res.status(201).json({ key: result.key, ...result.info })
})

async function keyOwner(db: typeof pool, id: number) {
  const { rows } = await db.query<{ user_id: number; email: string; status: string }>(
    `SELECT k.user_id, u.email, k.status FROM api_keys k JOIN users u ON u.id = k.user_id WHERE k.id = $1 AND k.status <> 'revoked'`,
    [id],
  )
  if (!rows[0]) throw new HttpError(404, 'NO_KEY', '이미 폐기됐거나 없는 키예요.')
  return rows[0]
}

adminRouter.patch('/keys/:id', async (req, res) => {
  const id = idParam(req.params.id)
  const { status } = z.object({ status: z.enum(['active', 'suspended']) }).parse(req.body)
  const owner = await keyOwner(pool, id)
  await tx(async (db) => {
    await db.query('UPDATE api_keys SET status = $2 WHERE id = $1', [id, status])
    await audit(db, { ...actor(res), action: status === 'active' ? 'key.activate' : 'key.suspend', targetType: 'user', targetId: owner.email })
  })
  res.status(204).end()
})

adminRouter.post('/keys/:id/reissue', async (req, res) => {
  const owner = await keyOwner(pool, idParam(req.params.id))
  const result = await tx(async (db) => {
    const r = await issueKey(db, owner.user_id, 'admin')
    await audit(db, { ...actor(res), action: 'key.reissue', targetType: 'user', targetId: owner.email })
    return r
  })
  res.status(201).json({ key: result.key, ...result.info })
})

adminRouter.delete('/keys/:id', async (req, res) => {
  const id = idParam(req.params.id)
  const owner = await keyOwner(pool, id)
  await tx(async (db) => {
    await db.query(`UPDATE api_keys SET status = 'revoked', revoked_at = now() WHERE id = $1`, [id])
    await audit(db, { ...actor(res), action: 'key.revoke', targetType: 'user', targetId: owner.email })
  })
  res.status(204).end()
})

// ── MCP 도구 ─────────────────────────────────────────────

adminRouter.get('/tools', async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT t.name, COALESCE(t.description_override, t.description) AS description,
            t.description AS "defaultDescription", t.description_override AS "descriptionOverride",
            t.category, t.enabled,
            count(c.id)::int AS calls,
            COALESCE(round(avg(c.latency_ms) FILTER (WHERE c.status = 200)), 0)::int AS latency,
            COALESCE(round(100.0 * count(c.id) FILTER (WHERE c.status >= 400) / NULLIF(count(c.id), 0), 1), 0)::float AS "errorRate"
       FROM tools t
       LEFT JOIN call_logs c ON c.tool_name = t.name AND c.${LAST_7D}
      WHERE t.retired_at IS NULL
      GROUP BY t.id
      ORDER BY t.sort_order, t.name`,
  )
  res.json(rows)
})

adminRouter.patch('/tools/:name', async (req, res) => {
  const name = String(req.params.name)
  const body = z
    .object({
      enabled: z.boolean().optional(),
      descriptionOverride: z.string().trim().max(2000).nullable().optional(),
    })
    .parse(req.body)

  await tx(async (db) => {
    const { rowCount } = await db.query(
      `UPDATE tools
          SET enabled = COALESCE($2, enabled),
              description_override = CASE WHEN $3::boolean THEN NULLIF($4, '') ELSE description_override END
        WHERE name = $1 AND retired_at IS NULL`,
      [name, body.enabled ?? null, body.descriptionOverride !== undefined, body.descriptionOverride ?? null],
    )
    if (!rowCount) throw new HttpError(404, 'NO_TOOL', '없는 도구예요.')
    if (body.enabled !== undefined) {
      await audit(db, { ...actor(res), action: body.enabled ? 'tool.enable' : 'tool.disable', targetType: 'tool', targetId: name })
    }
    if (body.descriptionOverride !== undefined) {
      await audit(db, { ...actor(res), action: 'tool.describe', targetType: 'tool', targetId: name })
    }
  })
  res.status(204).end()
})

// ── 사용 로그 ────────────────────────────────────────────

const logQuery = z.object({
  status: z.enum(['all', 'ok', 'error']).default('all'),
  q: z.string().trim().toLowerCase().default(''),
  limit: z.coerce.number().int().min(1).max(200).default(25),
  offset: z.coerce.number().int().min(0).default(0),
})

const LOG_WHERE = `
  WHERE ($1 = 'all' OR ($1 = 'ok' AND c.status < 400) OR ($1 = 'error' AND c.status >= 400))
    AND ($2 = '' OR strpos(lower(COALESCE(u.email, '')), $2) > 0 OR strpos(lower(c.tool_name), $2) > 0 OR strpos(lower(COALESCE(u.name, '')), $2) > 0)`

const LOG_SELECT = `
  SELECT c.id, c.called_at AS at, u.email, u.name, c.tool_name AS tool, c.client, c.status, c.latency_ms AS latency
    FROM call_logs c LEFT JOIN users u ON u.id = c.user_id ${LOG_WHERE}
   ORDER BY c.called_at DESC`

adminRouter.get('/logs', async (req, res) => {
  const p = logQuery.parse(req.query)
  const [rows, total] = await Promise.all([
    pool.query(`${LOG_SELECT} LIMIT $3 OFFSET $4`, [p.status, p.q, p.limit, p.offset]),
    pool.query(`SELECT count(*)::int AS n FROM call_logs c LEFT JOIN users u ON u.id = c.user_id ${LOG_WHERE}`, [p.status, p.q]),
  ])
  res.json({ total: total.rows[0].n, rows: rows.rows })
})

const csvCell = (v: unknown) => {
  const s = v instanceof Date ? v.toISOString() : String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

adminRouter.get('/logs.csv', async (req, res) => {
  const p = logQuery.parse(req.query)
  const { rows } = await pool.query(`${LOG_SELECT} LIMIT 10000`, [p.status, p.q])
  const lines = [
    ['시간', '이메일', '이름', '도구', '클라이언트', '상태', '응답(ms)'],
    ...rows.map((r) => [r.at, r.email, r.name, r.tool, r.client, r.status, r.latency]),
  ].map((line) => line.map(csvCell).join(','))
  const date = new Date().toISOString().slice(0, 10)
  res
    .type('text/csv; charset=utf-8')
    .set('Content-Disposition', `attachment; filename="mcp-logs-${date}.csv"`)
    .send('﻿' + lines.join('\n')) // 엑셀에서 한글이 깨지지 않도록 BOM
})

// ── 설정 ─────────────────────────────────────────────────
// 화면(관리자 > 설정)의 형태 그대로 주고받음

const KEY_TTLS = ['none', '90', '180', '365'] as const
const OTP_TTLS = ['3', '5', '10'] as const

adminRouter.get('/settings', async (_req, res) => {
  const s = await getSettings(pool)
  const { rows } = await pool.query<{ email: string }>('SELECT email FROM admins ORDER BY created_at, email')
  res.json({
    domains: s.allowedDomains,
    selfIssue: s.selfIssue,
    keyTtl: s.keyTtlDays === null ? 'none' : String(s.keyTtlDays),
    rateLimit: s.rateLimitPerMin,
    otpTtl: String(s.otpTtlMinutes),
    admins: rows.map((r) => r.email),
  })
})

adminRouter.put('/settings', async (req, res) => {
  const me = sessionOf(res).email
  const body = z
    .object({
      domains: z.array(z.string().trim().toLowerCase().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/)).min(1),
      selfIssue: z.boolean(),
      keyTtl: z.enum(KEY_TTLS),
      rateLimit: z.number().int().min(1).max(10_000),
      otpTtl: z.enum(OTP_TTLS),
      admins: z.array(z.string().trim().email().transform(normalizeEmail)).min(1),
    })
    .parse(req.body)
  if (!body.admins.includes(me)) throw new HttpError(400, 'SELF_REMOVE', '자기 자신은 관리자에서 뺄 수 없어요.')

  await tx(async (db) => {
    await updateSettings(
      db,
      {
        allowedDomains: [...new Set(body.domains)],
        selfIssue: body.selfIssue,
        keyTtlDays: body.keyTtl === 'none' ? null : Number(body.keyTtl),
        rateLimitPerMin: body.rateLimit,
        otpTtlMinutes: Number(body.otpTtl),
      },
      me,
    )
    await db.query('DELETE FROM admins WHERE NOT (email = ANY($1))', [body.admins])
    for (const email of body.admins) {
      await db.query('INSERT INTO admins (email, created_by) VALUES ($1, $2) ON CONFLICT DO NOTHING', [email, me])
    }
    await audit(db, { ...actor(res), action: 'settings.update' })
  })
  res.status(204).end()
})
