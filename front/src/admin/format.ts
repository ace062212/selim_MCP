const pad = (n: number) => String(n).padStart(2, '0')

export const fmtNum = (n: number) => n.toLocaleString('ko-KR')

export const fmtCompact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(n))

export function fmtDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`
}

export function fmtTime(iso: string) {
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export function timeAgo(iso: string | null) {
  if (!iso) return '사용 기록 없음'
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (min < 1) return '방금 전'
  if (min < 60) return `${min}분 전`
  if (min < 60 * 24) return `${Math.floor(min / 60)}시간 전`
  if (min < 60 * 24 * 30) return `${Math.floor(min / 60 / 24)}일 전`
  return fmtDate(iso)
}

export const maskKey = (key: string) => `${key.slice(0, 14)}••••${key.slice(-4)}`

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const inputClass =
  'h-10 rounded-md border border-slate-200 bg-white/80 px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky focus:ring-4 focus:ring-sky/20'
