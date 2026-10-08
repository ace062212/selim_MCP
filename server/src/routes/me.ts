import { Router } from 'express'
import { z } from 'zod'
import { pool, tx } from '../db.js'
import { audit } from '../lib/audit.js'
import { HttpError } from '../lib/http.js'
import { requireSession, sessionOf } from '../lib/session.js'
import { getSettings } from '../lib/settings.js'
import { getLiveKey, issueKey } from '../services/keys.js'
import { getUserTools } from '../services/tools.js'

export const meRouter = Router()
meRouter.use(requireSession('user'))

// 내 키 정보 (원문은 저장하지 않으므로 가려진 형태만)
meRouter.get('/key', async (_req, res) => {
  const key = await getLiveKey(pool, sessionOf(res).userId)
  if (!key) throw new HttpError(404, 'NO_KEY', '발급된 키가 없어요.')
  res.json(key)
})

// 발급 / 재발급. 응답의 key(원문)는 이번 한 번만 전달됨
meRouter.post('/key', async (_req, res) => {
  const { userId, email } = sessionOf(res)
  const { selfIssue } = await getSettings(pool)
  if (!selfIssue) throw new HttpError(403, 'SELF_ISSUE_DISABLED', '지금은 관리자만 키를 발급할 수 있어요. 관리자에게 요청해 주세요.')

  const result = await tx(async (db) => {
    const r = await issueKey(db, userId, 'self')
    await audit(db, { actorType: 'user', actorEmail: email, action: r.replaced ? 'key.reissue' : 'key.issue', targetType: 'user', targetId: email })
    return r
  })
  res.status(201).json({ key: result.key, ...result.info })
})

meRouter.get('/tools', async (_req, res) => {
  res.json(await getUserTools(pool, sessionOf(res).userId))
})

meRouter.put('/tools/:name', async (req, res) => {
  const { userId, email } = sessionOf(res)
  const { enabled } = z.object({ enabled: z.boolean() }).parse(req.body)
  const name = String(req.params.name)

  await tx(async (db) => {
    const { rows } = await db.query<{ id: number }>('SELECT id FROM tools WHERE name = $1 AND retired_at IS NULL', [name])
    if (!rows[0]) throw new HttpError(404, 'NO_TOOL', '없는 도구예요.')
    await db.query(
      `INSERT INTO user_tools (user_id, tool_id, enabled) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, tool_id) DO UPDATE SET enabled = EXCLUDED.enabled`,
      [userId, rows[0].id, enabled],
    )
    await audit(db, { actorType: 'user', actorEmail: email, action: 'user_tool.update', targetType: 'tool', targetId: name, detail: { enabled } })
  })
  res.json((await getUserTools(pool, userId)).find((t) => t.name === name))
})
