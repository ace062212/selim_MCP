import { Download, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Segmented } from '../components/ui'
import { api, errorMessage, type LogFilter, type LogRow } from '../lib/api'
import { fmtTime, inputClass, timeAgo } from './format'
import { Badge, Button, LoadError, PageHeader, Panel } from './ui'

const PAGE = 25

const STATUS_TEXT: Record<number, string> = { 200: '성공', 401: '인증 실패', 403: '사용 불가', 429: '요청 제한', 500: '서버 오류' }

function StatusBadge({ status }: { status: number }) {
  const tone = status < 300 ? 'green' : status < 500 ? 'amber' : 'rose'
  return (
    <Badge tone={tone}>
      <span className="font-mono">{status}</span> {STATUS_TEXT[status] ?? ''}
    </Badge>
  )
}

export default function LogsPage() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<LogFilter>({ status: 'all', q: '' })
  const [rows, setRows] = useState<LogRow[] | null>(null)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')
  const [loadingMore, setLoadingMore] = useState(false)

  // 검색어는 입력이 멈추고 0.3초 뒤에 반영
  useEffect(() => {
    const t = setTimeout(() => setFilter((f) => (f.q === query.trim() ? f : { ...f, q: query.trim() })), 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    let alive = true
    api.admin.logs(filter, 0, PAGE).then(
      (r) => {
        if (!alive) return
        setRows(r.rows)
        setTotal(r.total)
        setError('')
      },
      (err) => alive && setError(errorMessage(err)),
    )
    return () => {
      alive = false
    }
  }, [filter])

  const more = async () => {
    setLoadingMore(true)
    try {
      const r = await api.admin.logs(filter, rows?.length ?? 0, PAGE)
      setRows((prev) => [...(prev ?? []), ...r.rows])
      setTotal(r.total)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoadingMore(false)
    }
  }

  if (error && !rows) return <LoadError message={error} />

  return (
    <>
      <PageHeader
        title="사용 로그"
        desc="누가 어떤 도구를 호출했는지 확인할 수 있어요."
        action={
          // 쿠키 인증이라 주소로 바로 내려받음
          <a href={api.admin.logsCsvUrl(filter)} download>
            <Button variant="secondary" tabIndex={-1}>
              <Download className="h-4 w-4" />
              CSV 내보내기
            </Button>
          </a>
        }
      />

      <Panel>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="relative sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="사용자, 도구 검색" className={`${inputClass} w-full pl-9`} />
          </div>
          <Segmented
            className="sm:w-60"
            options={[
              { value: 'all', label: '전체' },
              { value: 'ok', label: '성공' },
              { value: 'error', label: '실패' },
            ]}
            value={filter.status}
            onChange={(status) => setFilter((f) => ({ ...f, status }))}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="px-5 py-3 font-medium">시간</th>
                <th className="px-3 py-3 font-medium">사용자</th>
                <th className="px-3 py-3 font-medium">도구</th>
                <th className="px-3 py-3 font-medium">클라이언트</th>
                <th className="px-3 py-3 text-right font-medium">응답</th>
                <th className="px-5 py-3 font-medium">상태</th>
              </tr>
            </thead>
            <tbody>
              {rows?.map((l) => (
                <tr key={l.id} className="border-t border-slate-100 transition-colors hover:bg-sky-soft/40">
                  <td className="px-5 py-3 whitespace-nowrap">
                    <span className="font-mono text-xs text-slate-700">{fmtTime(l.at)}</span>
                    <span className="ml-2 text-xs text-slate-400">{timeAgo(l.at)}</span>
                  </td>
                  <td className="px-3 py-3">
                    {l.email ? (
                      <>
                        <span className="text-slate-800">{l.name || l.email.split('@')[0]}</span>
                        <span className="ml-1.5 text-xs text-slate-400">{l.email}</span>
                      </>
                    ) : (
                      <span className="text-slate-400">알 수 없음 (잘못된 키)</span>
                    )}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-navy">{l.tool}</td>
                  <td className="px-3 py-3 text-slate-600">{l.client ?? '-'}</td>
                  <td className="px-3 py-3 text-right text-slate-600 tabular-nums">{l.latency == null ? '-' : `${l.latency}ms`}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={l.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows === null && <p className="border-t border-slate-100 py-16 text-center text-sm text-slate-400">불러오는 중…</p>}
          {rows?.length === 0 && <p className="border-t border-slate-100 py-16 text-center text-sm text-slate-400">조건에 맞는 로그가 없어요.</p>}
        </div>

        {!!rows?.length && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
            <span>
              {total.toLocaleString('ko-KR')}건 중 {rows.length.toLocaleString('ko-KR')}건 표시
            </span>
            {rows.length < total && (
              <button type="button" disabled={loadingMore} onClick={more} className="font-semibold text-navy hover:underline disabled:opacity-50">
                {loadingMore ? '불러오는 중…' : '더 보기'}
              </button>
            )}
          </div>
        )}
      </Panel>
    </>
  )
}
