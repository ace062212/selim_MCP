import type { Db } from '../db.js'
import { audit } from '../lib/audit.js'

export type UserTool = {
  name: string
  description: string
  category: string | null
  adminEnabled: boolean
  userEnabled: boolean
  enabled: boolean
}

// 사용자 기준 도구 목록 (관리자 설정 + 개인 설정 합산, 규칙: doc/04-tool-policy.md)
export async function getUserTools(db: Db, userId: number): Promise<UserTool[]> {
  const { rows } = await db.query(
    `SELECT v.tool_name AS name, v.description, t.category,
            v.admin_enabled AS "adminEnabled", v.user_enabled AS "userEnabled", v.effective_enabled AS enabled
       FROM v_user_tools v JOIN tools t ON t.id = v.tool_id
      WHERE v.user_id = $1
      ORDER BY t.sort_order, t.name`,
    [userId],
  )
  return rows
}

export type ToolSpec = { name: string; description: string; category: string }

// 코드에 정의된 도구를 DB에 맞춤
// - 새 도구: 관리자 꺼짐으로 추가 → 관리자가 MCP 도구 화면에서 켜야 공개됨
// - 기존 도구: 설명·분류·순서만 갱신 (켜기/끄기 상태는 그대로)
// - 코드에서 빠진 도구: retired 처리 (기록 보존). 다시 넣으면 예전 상태로 돌아옴
export async function syncTools(db: Db, specs: ToolSpec[]) {
  const added: string[] = []
  for (const [i, t] of specs.entries()) {
    const { rows } = await db.query<{ inserted: boolean }>(
      `INSERT INTO tools (name, description, category, sort_order, enabled) VALUES ($1, $2, $3, $4, false)
       ON CONFLICT (name) DO UPDATE
         SET description = EXCLUDED.description, category = EXCLUDED.category,
             sort_order = EXCLUDED.sort_order, retired_at = NULL
       RETURNING (xmax = 0) AS inserted`,
      [t.name, t.description, t.category, i],
    )
    if (rows[0].inserted) added.push(t.name)
  }
  for (const name of added) {
    await audit(db, { actorType: 'system', action: 'tool.register', targetType: 'tool', targetId: name })
  }
  if (added.length) console.log(`[tools] 새 도구 등록 (관리자가 켜야 공개됨): ${added.join(', ')}`)

  const { rows } = await db.query<{ name: string }>(
    `UPDATE tools SET retired_at = now() WHERE retired_at IS NULL AND NOT (name = ANY($1)) RETURNING name`,
    [specs.map((t) => t.name)],
  )
  if (rows.length) console.log(`[tools] 코드에서 빠진 도구: ${rows.map((r) => r.name).join(', ')}`)
}
