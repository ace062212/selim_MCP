// sql/ddl 의 파일을 번호 순서대로 한 번씩만 실행하고, sql/seed 는 매번 실행 (seed는 여러 번 실행해도 안전하게 작성)
// 사용: npm run db:migrate
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const SQL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../sql')
const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL이 없어요. server/.env를 확인해 주세요.')

const client = new pg.Client({ connectionString: url })
await client.connect()

const sqlFiles = (dir: string) =>
  fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort() : []

try {
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (filename text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`)
  const applied = new Set((await client.query<{ filename: string }>('SELECT filename FROM schema_migrations')).rows.map((r) => r.filename))

  for (const file of sqlFiles(path.join(SQL_DIR, 'ddl'))) {
    if (applied.has(file)) continue
    console.log(`[ddl] ${file}`)
    try {
      await client.query(fs.readFileSync(path.join(SQL_DIR, 'ddl', file), 'utf8'))
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {})
      throw err
    }
    await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file])
  }
  for (const file of sqlFiles(path.join(SQL_DIR, 'seed'))) {
    console.log(`[seed] ${file}`)
    await client.query(fs.readFileSync(path.join(SQL_DIR, 'seed', file), 'utf8'))
  }
  console.log('마이그레이션 완료')
} finally {
  await client.end()
}
