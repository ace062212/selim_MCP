// 서버 API 호출 (server/src/routes). 세션은 HttpOnly 쿠키라 여기서 따로 다루지 않음

export class ApiError extends Error {
  status: number
  code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

// 관리자 API가 401/403이면 관리자 화면이 로그인으로 돌아가도록 알림
export const ADMIN_UNAUTHORIZED = 'selim-admin-unauthorized'

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, {
      ...init,
      credentials: 'same-origin',
      headers: init.body ? { 'content-type': 'application/json', ...init.headers } : init.headers,
    })
  } catch {
    throw new ApiError(0, 'NETWORK', '서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.')
  }
  if (res.status === 204) return undefined as T
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    if (path.startsWith('/api/admin') && (res.status === 401 || res.status === 403)) {
      window.dispatchEvent(new Event(ADMIN_UNAUTHORIZED))
    }
    throw new ApiError(res.status, body?.code ?? 'UNKNOWN', body?.message ?? '요청을 처리하지 못했어요.')
  }
  return body as T
}

const get = <T>(path: string) => request<T>(path)
const send = <T>(method: string, path: string, body?: unknown) =>
  request<T>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) })

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : '알 수 없는 오류가 발생했어요.')

// ── 타입 ──

export type Purpose = 'issue' | 'lookup' | 'settings' | 'admin'

export type KeyInfo = {
  id: number
  masked: string
  status: 'active' | 'suspended'
  issuedAt: string
  expiresAt: string | null
  lastUsedAt: string | null
}
// 발급 직후에만 원문(key)이 함께 옴
export type IssuedKey = KeyInfo & { key: string }

export type UserTool = {
  name: string
  description: string
  category: string | null
  adminEnabled: boolean
  userEnabled: boolean
  enabled: boolean
}

export type AdminKey = KeyInfo & {
  email: string
  name: string | null
  dept: string | null
  issuedBy: 'self' | 'admin'
  requests: number
}

export type AdminTool = {
  name: string
  description: string
  defaultDescription: string
  descriptionOverride: string | null
  category: string | null
  enabled: boolean
  calls: number
  latency: number
  errorRate: number
}

export type Stats = {
  keys: { active: number; suspended: number; total: number }
  daily: { label: string; value: number }[]
  avgLatency: number
  errorRate: number
  topTools: { name: string; calls: number }[]
  clients: { name: string; calls: number }[]
}

export type Activity = {
  id: number
  at: string
  actorType: 'admin' | 'user' | 'system'
  actorEmail: string | null
  action: string
  targetType: string | null
  targetId: string | null
  detail: Record<string, unknown> | null
}

export type LogRow = {
  id: number
  at: string
  email: string | null
  name: string | null
  tool: string
  client: string | null
  status: number
  latency: number | null
}

export type LogFilter = { status: 'all' | 'ok' | 'error'; q: string }

export type Settings = {
  domains: string[]
  selfIssue: boolean
  keyTtl: 'none' | '90' | '180' | '365'
  rateLimit: number
  otpTtl: '3' | '5' | '10'
  admins: string[]
}

const logParams = (f: LogFilter, extra: Record<string, number> = {}) =>
  new URLSearchParams({ status: f.status, q: f.q, ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, String(v)])) })

// ── API ──

export const api = {
  health: () => get<{ ok: boolean; version: string }>('/api/health'),

  requestOtp: (email: string, purpose: Purpose) =>
    send<{ ttlMinutes: number; devMode: boolean }>('POST', '/api/auth/otp', { email, purpose }),
  verifyOtp: (email: string, purpose: Purpose, code: string) =>
    send<{ email: string }>('POST', '/api/auth/verify', { email, purpose, code }),
  session: (kind: 'user' | 'admin') => get<{ email: string }>(`/api/auth/session?kind=${kind}`),
  logout: (kind: 'user' | 'admin') => send<void>('POST', '/api/auth/logout', { kind }),

  // 발급된 키가 없으면 null
  myKey: async () => {
    try {
      return await get<KeyInfo>('/api/me/key')
    } catch (e) {
      if (e instanceof ApiError && e.code === 'NO_KEY') return null
      throw e
    }
  },
  issueMyKey: () => send<IssuedKey>('POST', '/api/me/key'),
  myTools: () => get<UserTool[]>('/api/me/tools'),
  setMyTool: (name: string, enabled: boolean) => send<UserTool>('PUT', `/api/me/tools/${encodeURIComponent(name)}`, { enabled }),

  admin: {
    stats: () => get<Stats>('/api/admin/stats'),
    activity: (limit = 20) => get<Activity[]>(`/api/admin/activity?limit=${limit}`),
    keys: () => get<AdminKey[]>('/api/admin/keys'),
    issueKey: (email: string) => send<IssuedKey>('POST', '/api/admin/keys', { email }),
    setKeyStatus: (id: number, status: 'active' | 'suspended') => send<void>('PATCH', `/api/admin/keys/${id}`, { status }),
    reissueKey: (id: number) => send<IssuedKey>('POST', `/api/admin/keys/${id}/reissue`),
    revokeKey: (id: number) => send<void>('DELETE', `/api/admin/keys/${id}`),
    tools: () => get<AdminTool[]>('/api/admin/tools'),
    updateTool: (name: string, patch: { enabled?: boolean; descriptionOverride?: string | null }) =>
      send<void>('PATCH', `/api/admin/tools/${encodeURIComponent(name)}`, patch),
    logs: (f: LogFilter, offset: number, limit = 25) =>
      get<{ total: number; rows: LogRow[] }>(`/api/admin/logs?${logParams(f, { offset, limit })}`),
    logsCsvUrl: (f: LogFilter) => `/api/admin/logs.csv?${logParams(f)}`,
    settings: () => get<Settings>('/api/admin/settings'),
    saveSettings: (s: Settings) => send<void>('PUT', '/api/admin/settings', s),
  },
}
