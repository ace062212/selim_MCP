import type { Db } from '../db.js'

export const normalizeEmail = (email: string) => email.trim().toLowerCase()

export async function upsertUser(db: Db, email: string): Promise<number> {
  const { rows } = await db.query<{ id: number }>(
    `INSERT INTO users (email) VALUES ($1)
     ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
     RETURNING id`,
    [normalizeEmail(email)],
  )
  return rows[0].id
}

export async function isAdmin(db: Db, email: string) {
  const { rowCount } = await db.query('SELECT 1 FROM admins WHERE email = $1', [normalizeEmail(email)])
  return rowCount === 1
}

// admins 테이블이 비어 있으면 환경변수의 이메일로 최초 관리자 등록
export async function bootstrapAdmins(db: Db, emails: string[]) {
  const { rows } = await db.query<{ n: number }>('SELECT count(*)::int AS n FROM admins')
  if (rows[0].n > 0 || emails.length === 0) return
  for (const email of emails) {
    await db.query(`INSERT INTO admins (email, created_by) VALUES ($1, 'bootstrap') ON CONFLICT DO NOTHING`, [email])
  }
  console.log(`[bootstrap] 최초 관리자 등록: ${emails.join(', ')}`)
}
