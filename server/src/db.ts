import pg from 'pg'
import { config } from './config.js'

// bigint(int8)를 문자열 대신 숫자로 받음 (id, count 등이 2^53을 넘을 일은 없음)
pg.types.setTypeParser(20, (v) => Number(v))

export const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 10 })

export type Db = pg.Pool | pg.PoolClient

export async function tx<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
