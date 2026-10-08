import type { Db } from '../db.js'
import { getSettings } from '../lib/settings.js'

// 오래된 기록 정리: 호출 기록은 보관 기간(settings.log_retention_days) 이후, 인증번호는 하루 뒤 삭제
export async function cleanup(db: Db) {
  const { logRetentionDays } = await getSettings(db)
  const logs = await db.query('DELETE FROM call_logs WHERE called_at < now() - make_interval(days => $1)', [logRetentionDays])
  const otps = await db.query(`DELETE FROM email_otps WHERE created_at < now() - interval '1 day'`)
  if (logs.rowCount || otps.rowCount) console.log(`[cleanup] 호출 기록 ${logs.rowCount}건, 인증번호 ${otps.rowCount}건 삭제`)
}

export function scheduleCleanup(db: Db) {
  const run = () => cleanup(db).catch((err) => console.error('[cleanup] 실패', err))
  void run()
  setInterval(run, 24 * 60 * 60 * 1000).unref()
}
