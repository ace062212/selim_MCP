import cookieParser from 'cookie-parser'
import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { config } from './config.js'
import { pool } from './db.js'
import { errorHandler } from './lib/http.js'
import { SERVER_VERSION, mcpHandler, mcpMethodNotAllowed, toolSpecs } from './mcp/handler.js'
import { adminRouter } from './routes/admin.js'
import { authRouter } from './routes/auth.js'
import { meRouter } from './routes/me.js'
import { scheduleCleanup } from './services/cleanup.js'
import { syncTools } from './services/tools.js'
import { bootstrapAdmins } from './services/users.js'

const app = express()
app.disable('x-powered-by')
if (config.trustProxy) app.set('trust proxy', 1)
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

app.get('/api/health', async (_req, res) => {
  await pool.query('SELECT 1')
  res.json({ ok: true, version: SERVER_VERSION })
})
app.use('/api/auth', authRouter)
app.use('/api/me', meRouter)
app.use('/api/admin', adminRouter)

app.post('/mcp', mcpHandler)
app.get('/mcp', mcpMethodNotAllowed)
app.delete('/mcp', mcpMethodNotAllowed)

// 프론트 빌드 결과물을 같이 내려줌. /admin 등 화면 주소는 index.html로 (SPA)
if (config.frontDist && fs.existsSync(path.join(config.frontDist, 'index.html'))) {
  const index = path.join(config.frontDist, 'index.html')
  app.use(express.static(config.frontDist, { index: false }))
  app.get(/^\/(?!api\/|mcp$).*/, (_req, res) => res.sendFile(index))
  console.log(`[front] ${config.frontDist} 제공`)
} else if (config.frontDist) {
  console.warn(`[front] ${config.frontDist}/index.html이 없어서 API만 제공해요. (front에서 npm run build 필요)`)
}

app.use('/api', (_req, res) => {
  res.status(404).json({ code: 'NOT_FOUND', message: '없는 API예요.' })
})
app.use(errorHandler)

await pool.query('SELECT 1').catch((err) => {
  console.error('DB에 연결할 수 없어요. DATABASE_URL과 마이그레이션(npm run db:migrate)을 확인해 주세요.')
  throw err
})
await syncTools(pool, toolSpecs)
await bootstrapAdmins(pool, config.initialAdmins)
scheduleCleanup(pool)

app.listen(config.port, () => {
  console.log(`selim-mcp 서버 실행: http://localhost:${config.port}  (MCP: /mcp, API: /api)`)
  if (config.otpDevAcceptAny) console.warn('⚠ OTP_DEV_ACCEPT_ANY=true — 아무 6자리 인증번호나 통과해요 (개발용)')
})
