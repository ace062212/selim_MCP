import { listKeys } from '../lib/keyStore'
import { mulberry32 } from '../lib/random'

// 화면 확인용 예시 데이터
// TODO: 백엔드 연동 시 관리자 API 응답으로 교체

const rand = mulberry32(20261008)
const pick = <T,>(list: readonly T[]) => list[Math.floor(rand() * list.length)]

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR
const NOW = Date.now()
const iso = (t: number) => new Date(t).toISOString()

export const CLIENTS = ['Claude Code', 'Claude Desktop', 'Cursor'] as const
export type Client = (typeof CLIENTS)[number]

export type KeyStatus = 'active' | 'suspended'

export type Member = {
  email: string
  name: string
  dept: string
  key: string
  issuedAt: string
  lastUsedAt: string | null
  requests: number
  status: KeyStatus
}

const PEOPLE: [string, string][] = [
  ['김민준', 'minjun.kim'],
  ['이서연', 'seoyeon.lee'],
  ['박도윤', 'doyun.park'],
  ['최지우', 'jiwoo.choi'],
  ['정하준', 'hajun.jung'],
  ['강서윤', 'seoyun.kang'],
  ['조은우', 'eunwoo.jo'],
  ['윤지호', 'jiho.yoon'],
  ['장수아', 'sua.jang'],
  ['임시우', 'siwoo.lim'],
  ['한예린', 'yerin.han'],
  ['오건우', 'geonwoo.oh'],
  ['서하은', 'haeun.seo'],
  ['신유준', 'yujun.shin'],
  ['권나연', 'nayeon.kwon'],
  ['황준서', 'junseo.hwang'],
  ['안지민', 'jimin.ahn'],
  ['송현우', 'hyunwoo.song'],
  ['류채원', 'chaewon.ryu'],
  ['전태윤', 'taeyun.jeon'],
]

const DEPTS = ['클라우드사업본부', '공공사업팀', 'MSP운영팀', '기술연구소', '보안관제팀', '영업본부', '경영지원팀']

function fakeKey() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let key = 'selim_mcp_'
  for (let i = 0; i < 32; i++) key += chars[Math.floor(rand() * chars.length)]
  return key
}

const BASE_MEMBERS: Member[] = PEOPLE.map(([name, id]) => {
  const age = (3 + rand() * 150) * DAY
  const unused = rand() < 0.1
  return {
    email: `${id}@selim.kr`,
    name,
    dept: pick(DEPTS),
    key: fakeKey(),
    issuedAt: iso(NOW - age),
    lastUsedAt: unused ? null : iso(NOW - rand() * rand() * Math.min(5 * DAY, age)),
    requests: unused ? 0 : Math.round(40 + rand() * rand() * 2600),
    status: rand() < 0.12 ? 'suspended' : 'active',
  }
})

// 예시 데이터 + 사용자 페이지에서 실제로 발급한 키(localStorage)
export function loadMembers(): Member[] {
  const stored: Member[] = listKeys()
    .filter((r) => !BASE_MEMBERS.some((m) => m.email === r.email))
    .map((r) => ({
      email: r.email,
      name: '',
      dept: '',
      key: r.key,
      issuedAt: r.issuedAt,
      lastUsedAt: null,
      requests: 0,
      status: 'active',
    }))
  return [...stored, ...BASE_MEMBERS].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))
}

export type Tool = {
  id: string
  desc: string
  category: string
  enabled: boolean
  calls: number
  latency: number
  errorRate: number
}

export const TOOLS: Tool[] = [
  { id: 'search_docs', desc: '사내 문서·위키에서 키워드로 검색해요.', category: '문서', enabled: true, calls: 4820, latency: 420, errorRate: 0.4 },
  { id: 'g2b_bid_search', desc: '나라장터 입찰공고를 조건별로 조회해요.', category: '공공데이터', enabled: true, calls: 3110, latency: 860, errorRate: 2.1 },
  { id: 'project_status', desc: '진행 중인 프로젝트 현황과 일정을 조회해요.', category: '업무', enabled: true, calls: 2240, latency: 310, errorRate: 0.6 },
  { id: 'cloud_usage', desc: 'G-Cloud 리소스 사용량과 비용을 조회해요.', category: '클라우드', enabled: true, calls: 1680, latency: 540, errorRate: 0.9 },
  { id: 'incident_lookup', desc: '장애·보안 이벤트 이력을 조회해요.', category: '운영', enabled: true, calls: 920, latency: 380, errorRate: 0.3 },
  { id: 'contract_lookup', desc: '계약·발주 정보를 조회해요.', category: '업무', enabled: true, calls: 640, latency: 290, errorRate: 0.2 },
  { id: 'org_directory', desc: '임직원 연락처와 소속을 검색해요.', category: '문서', enabled: true, calls: 510, latency: 150, errorRate: 0.1 },
  { id: 'calendar_events', desc: '팀 일정과 회의실 예약을 조회해요.', category: '업무', enabled: false, calls: 0, latency: 0, errorRate: 0 },
]

// 최근 14일 일별 요청 수 (주말은 적게)
export const DAILY = Array.from({ length: 14 }, (_, i) => {
  const d = new Date(NOW - (13 - i) * DAY)
  const weekend = d.getDay() === 0 || d.getDay() === 6
  return {
    label: `${d.getMonth() + 1}/${d.getDate()}`,
    value: Math.round((weekend ? 240 : 1050) + i * 30 + rand() * 280),
  }
})

export type Log = {
  id: number
  at: string
  email: string
  tool: string
  client: Client
  status: number
  latency: number
}

function weightedTool() {
  const enabled = TOOLS.filter((t) => t.enabled)
  let r = rand() * enabled.reduce((sum, t) => sum + t.calls, 0)
  for (const t of enabled) {
    r -= t.calls
    if (r <= 0) return t
  }
  return enabled[0]
}

function weightedClient(): Client {
  const r = rand()
  return r < 0.55 ? 'Claude Code' : r < 0.85 ? 'Claude Desktop' : 'Cursor'
}

const activeEmails = BASE_MEMBERS.filter((m) => m.status === 'active' && m.requests > 0).map((m) => m.email)
let cursor = NOW - 20_000

export const LOGS: Log[] = Array.from({ length: 140 }, (_, id) => {
  cursor -= (0.2 + rand() * rand() * 10) * MIN
  const tool = weightedTool()
  const r = rand()
  const status = r < 0.965 ? 200 : r < 0.98 ? 401 : r < 0.99 ? 429 : 500
  return {
    id,
    at: iso(cursor),
    email: pick(activeEmails),
    tool: tool.id,
    client: weightedClient(),
    status,
    latency: status === 401 || status === 429 ? Math.round(12 + rand() * 30) : Math.round(tool.latency * (0.5 + rand())),
  }
})

export type Activity = { id: string; text: string; at: string; tone: 'navy' | 'sky' | 'amber' | 'rose' | 'slate' }

export const ACTIVITY: Activity[] = [
  { id: 'a1', text: '이서연님이 API 키를 발급했어요', at: iso(NOW - 12 * MIN), tone: 'sky' },
  { id: 'a2', text: 'g2b_bid_search 오류율이 2%를 넘었어요', at: iso(NOW - 48 * MIN), tone: 'amber' },
  { id: 'a3', text: '관리자가 조은우님의 키를 정지했어요', at: iso(NOW - 3 * HOUR), tone: 'rose' },
  { id: 'a4', text: 'calendar_events 도구를 비활성화했어요', at: iso(NOW - 26 * HOUR), tone: 'slate' },
  { id: 'a5', text: '박도윤님이 API 키를 재발급했어요', at: iso(NOW - 2 * DAY), tone: 'navy' },
]

export type Settings = {
  domains: string[]
  selfIssue: boolean
  keyTtl: 'none' | '90' | '180' | '365'
  rateLimit: number
  otpTtl: '3' | '5' | '10'
  admins: string[]
}

export const DEFAULT_SETTINGS: Settings = {
  domains: ['selim.kr'],
  selfIssue: true,
  keyTtl: 'none',
  rateLimit: 60,
  otpTtl: '3',
  admins: ['admin@selim.kr'],
}
