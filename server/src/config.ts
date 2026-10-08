import path from 'node:path'

function required(name: string, minLength = 1) {
  const value = process.env[name]?.trim()
  if (!value || value.length < minLength) {
    throw new Error(`환경변수 ${name}가 없거나 너무 짧아요 (최소 ${minLength}자). server/.env.example 참고`)
  }
  return value
}

const isProd = process.env.NODE_ENV === 'production'
const otpDevAcceptAny = process.env.OTP_DEV_ACCEPT_ANY === 'true'

if (isProd && otpDevAcceptAny) {
  throw new Error('운영 환경(NODE_ENV=production)에서는 OTP_DEV_ACCEPT_ANY=true를 쓸 수 없어요.')
}

export const config = {
  port: Number(process.env.PORT ?? 8080),
  isProd,
  databaseUrl: required('DATABASE_URL'),
  sessionSecret: required('SESSION_SECRET', 32),
  otpPepper: required('OTP_PEPPER', 32),
  otpDevAcceptAny,
  initialAdmins: (process.env.INITIAL_ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  frontDist: process.env.FRONT_DIST ? path.resolve(process.env.FRONT_DIST) : null,
  trustProxy: process.env.TRUST_PROXY === 'true',
}
