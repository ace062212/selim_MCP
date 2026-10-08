import type { Db } from '../db.js'

export type AuditInput = {
  actorType: 'admin' | 'user' | 'system'
  actorEmail?: string | null
  action: string
  targetType?: string
  targetId?: string | number
  detail?: Record<string, unknown>
}

// 대시보드 "최근 활동"에 보이는 기록
export async function audit(db: Db, a: AuditInput) {
  await db.query(
    `INSERT INTO audit_logs (actor_type, actor_email, action, target_type, target_id, detail)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [a.actorType, a.actorEmail ?? null, a.action, a.targetType ?? null, a.targetId == null ? null : String(a.targetId), a.detail ?? null],
  )
}
