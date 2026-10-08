import type { Request, RequestHandler, Response } from 'express'
import { SignJWT, jwtVerify } from 'jose'
import { config } from '../config.js'
import { HttpError } from './http.js'

// 사용자 화면과 관리자 화면은 쿠키를 따로 씀 (한쪽 로그인이 다른 쪽을 덮어쓰지 않도록)
export type SessionKind = 'user' | 'admin'
export type Session = { email: string; userId: number }

const COOKIE: Record<SessionKind, string> = { user: 'smcp_user', admin: 'smcp_admin' }
const secret = new TextEncoder().encode(config.sessionSecret)

export async function setSession(res: Response, kind: SessionKind, session: Session, ttlMinutes: number) {
  const token = await new SignJWT({ uid: session.userId, kind })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(session.email)
    .setIssuedAt()
    .setExpirationTime(`${ttlMinutes}m`)
    .sign(secret)
  res.cookie(COOKIE[kind], token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd,
    maxAge: ttlMinutes * 60_000,
    path: '/',
  })
}

export function clearSession(res: Response, kind: SessionKind) {
  res.clearCookie(COOKIE[kind], { path: '/' })
}

export async function readSession(req: Request, kind: SessionKind): Promise<Session | null> {
  const token = req.cookies?.[COOKIE[kind]]
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] })
    if (payload.kind !== kind || !payload.sub || typeof payload.uid !== 'number') return null
    return { email: payload.sub, userId: payload.uid }
  } catch {
    return null
  }
}

// 통과하면 res.locals.session 에 세션을 넣어 둠
export function requireSession(kind: SessionKind): RequestHandler {
  return async (req, res, next) => {
    const session = await readSession(req, kind)
    if (!session) throw new HttpError(401, 'SESSION_EXPIRED', '인증이 만료됐어요. 이메일 인증을 다시 해 주세요.')
    res.locals.session = session
    next()
  }
}

export const sessionOf = (res: Response) => res.locals.session as Session
