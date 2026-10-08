import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import { config } from '../config.js'

const KEY_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
export const KEY_PREFIX = 'selim_mcp_'

export function generateApiKey() {
  const bytes = randomBytes(32)
  // 62로 나눈 나머지라 약간의 편향이 있지만 32자 * 5.9bit ≈ 190bit라 충분
  return KEY_PREFIX + Array.from(bytes, (b) => KEY_CHARS[b % KEY_CHARS.length]).join('')
}

export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')

export function maskKey(prefix: string, last4: string) {
  return `${prefix}••••••••${last4}`
}

export function generateOtp() {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

export const hashOtp = (code: string) => createHmac('sha256', config.otpPepper).update(code).digest('hex')

export function safeEqualHex(a: string, b: string) {
  const ba = Buffer.from(a, 'hex')
  const bb = Buffer.from(b, 'hex')
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}
