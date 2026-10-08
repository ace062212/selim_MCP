// 임시 키 저장소: 백엔드 연동 전까지 브라우저 localStorage에 이메일별 키를 보관
// TODO: 백엔드 연동 시 발급/조회 API로 교체

export type KeyRecord = { key: string; issuedAt: string }

const STORAGE_KEY = 'selim-mcp-keys'

function readAll(): Record<string, KeyRecord> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function generateKey() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return 'selim_mcp_' + Array.from(bytes, (b) => chars[b % chars.length]).join('')
}

const normalize = (email: string) => email.trim().toLowerCase()

export function findKey(email: string): KeyRecord | null {
  return readAll()[normalize(email)] ?? null
}

// 새 키를 발급하고 기존 키는 덮어씀
export function issueKey(email: string): KeyRecord {
  const record = { key: generateKey(), issuedAt: new Date().toISOString() }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readAll(), [normalize(email)]: record }))
  } catch {
    // 저장 실패 시에도 이번 화면에서는 키를 보여줌
  }
  return record
}

// 관리자 화면용: 저장된 모든 키 목록
export function listKeys(): (KeyRecord & { email: string })[] {
  return Object.entries(readAll()).map(([email, record]) => ({ email, ...record }))
}

export function revokeKey(email: string) {
  const all = readAll()
  delete all[normalize(email)]
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    // 저장 실패 시 무시
  }
}
