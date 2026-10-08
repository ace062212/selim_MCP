import { Router } from 'express'
import { z } from 'zod'
import { config } from '../config.js'
import { pool } from '../db.js'
import { generateOtp, hashOtp, safeEqualHex } from '../lib/crypto.js'
import { HttpError } from '../lib/http.js'
import { mailer } from '../lib/mailer.js'
import { clearSession, readSession, setSession } from '../lib/session.js'
import { getSettings } from '../lib/settings.js'
import { isAdmin, normalizeEmail, upsertUser } from '../services/users.js'

export const authRouter = Router()

const email = z.string().trim().email().max(320).transform(normalizeEmail)
const purpose = z.enum(['issue', 'lookup', 'settings', 'admin'])
const kind = z.enum(['user', 'admin'])

// 인증번호 발송
authRouter.post('/otp', async (req, res) => {
  const body = z.object({ email, purpose }).parse(req.body)
  const settings = await getSettings(pool)

  const domain = body.email.split('@')[1]
  if (!settings.allowedDomains.includes(domain)) {
    throw new HttpError(400, 'DOMAIN_NOT_ALLOWED', `회사 이메일(${settings.allowedDomains.map((d) => '@' + d).join(', ')})만 사용할 수 있어요.`)
  }

  // 메일 폭탄 방지: 같은 이메일은 30초에 1번, 1시간에 10번
  const { rows } = await pool.query<{ last: Date | null; hour: number }>(
    `SELECT max(created_at) AS last, count(*) FILTER (WHERE created_at > now() - interval '1 hour')::int AS hour
       FROM email_otps WHERE email = $1`,
    [body.email],
  )
  if (rows[0].last && Date.now() - rows[0].last.getTime() < 30_000) {
    throw new HttpError(429, 'OTP_TOO_SOON', '인증번호는 30초 후에 다시 받을 수 있어요.')
  }
  if (rows[0].hour >= 10) throw new HttpError(429, 'OTP_TOO_MANY', '인증번호 요청이 너무 많아요. 1시간 후에 다시 시도해 주세요.')

  const code = generateOtp()
  await pool.query(
    `INSERT INTO email_otps (email, purpose, code_hash, expires_at, request_ip)
     VALUES ($1, $2, $3, now() + make_interval(mins => $4), $5)`,
    [body.email, body.purpose, hashOtp(code), settings.otpTtlMinutes, req.ip ?? null],
  )
  await mailer.sendOtp(body.email, code, settings.otpTtlMinutes)

  res.json({ ttlMinutes: settings.otpTtlMinutes, devMode: config.otpDevAcceptAny })
})

// 인증번호 확인 → 세션 쿠키 발급
authRouter.post('/verify', async (req, res) => {
  const body = z.object({ email, purpose, code: z.string().regex(/^\d{6}$/, '6자리 숫자') }).parse(req.body)
  const settings = await getSettings(pool)

  const { rows } = await pool.query<{ id: number; code_hash: string; attempts: number; expired: boolean }>(
    `SELECT id, code_hash, attempts, expires_at < now() AS expired
       FROM email_otps
      WHERE email = $1 AND purpose = $2 AND consumed_at IS NULL
      ORDER BY created_at DESC LIMIT 1`,
    [body.email, body.purpose],
  )
  const otp = rows[0]
  if (!otp || otp.expired) throw new HttpError(400, 'OTP_EXPIRED', '인증번호가 만료됐어요. 다시 받아 주세요.')
  if (otp.attempts >= settings.otpMaxAttempts) throw new HttpError(400, 'OTP_LOCKED', '시도 횟수를 넘었어요. 인증번호를 다시 받아 주세요.')

  const ok = config.otpDevAcceptAny || safeEqualHex(otp.code_hash, hashOtp(body.code))
  if (!ok) {
    await pool.query('UPDATE email_otps SET attempts = attempts + 1 WHERE id = $1', [otp.id])
    const left = settings.otpMaxAttempts - otp.attempts - 1
    throw new HttpError(400, 'OTP_INVALID', left > 0 ? `인증번호가 맞지 않아요. (${left}번 남음)` : '시도 횟수를 넘었어요. 인증번호를 다시 받아 주세요.')
  }

  if (body.purpose === 'admin' && !(await isAdmin(pool, body.email))) {
    throw new HttpError(403, 'NOT_ADMIN', '관리자로 등록된 이메일이 아니에요.')
  }

  await pool.query('UPDATE email_otps SET consumed_at = now() WHERE id = $1', [otp.id])
  const userId = await upsertUser(pool, body.email)
  await setSession(res, body.purpose === 'admin' ? 'admin' : 'user', { email: body.email, userId }, settings.sessionTtlMinutes)
  res.json({ email: body.email })
})

// 현재 로그인 상태 (관리자 화면 첫 진입 시 확인)
authRouter.get('/session', async (req, res) => {
  const k = kind.parse(req.query.kind ?? 'user')
  const session = await readSession(req, k)
  if (!session) throw new HttpError(401, 'SESSION_EXPIRED', '로그인이 필요해요.')
  if (k === 'admin' && !(await isAdmin(pool, session.email))) throw new HttpError(403, 'NOT_ADMIN', '관리자 권한이 없어요.')
  res.json({ email: session.email })
})

authRouter.post('/logout', (req, res) => {
  clearSession(res, kind.parse(req.body?.kind ?? 'user'))
  res.status(204).end()
})
