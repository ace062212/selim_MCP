import { Download, Search } from 'lucide-react'
import { useState } from 'react'
import { Segmented } from '../components/ui'
import { fmtTime, inputClass, timeAgo } from './format'
import { LOGS, type Log, type Member } from './mockData'
import { Badge, Button, PageHeader, Panel } from './ui'

type Filter = 'all' | 'ok' | 'error'
const PAGE = 25

const STATUS_TEXT: Record<number, string> = { 200: '성공', 401: '인증 실패', 429: '요청 제한', 500: '서버 오류' }

function StatusBadge({ status }: { status: number }) {
  const tone = status < 300 ? 'green' : status < 500 ? 'amber' : 'rose'
  return (
    <Badge tone={tone}>
      <span className="font-mono">{status}</span> {STATUS_TEXT[status]}
    </Badge>
  )
}

// 엑셀에서 한글이 깨지지 않도록 BOM을 붙여서 저장
function downloadCsv(logs: Log[]) {
  const rows = [['시간', '사용자', '도구', '클라이언트', '상태', '응답(ms)'], ...logs.map((l) => [l.at, l.email, l.tool, l.client, l.status, l.latency])]
  const csv = '﻿' + rows.map((r) => r.join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `mcp-logs-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function LogsPage({ members }: { members: Member[] }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [limit, setLimit] = useState(PAGE)

  const names = new Map(members.map((m) => [m.email, m.name]))
  const q = query.trim().toLowerCase()
  const rows = LOGS.filter(
    (l) =>
      (filter === 'all' || (filter === 'ok' ? l.status < 400 : l.status >= 400)) &&
      (!q || l.email.includes(q) || l.tool.includes(q) || (names.get(l.email) ?? '').includes(q)),
  )

  return (
    <>
      <PageHeader
        title="사용 로그"
        desc="누가 어떤 도구를 호출했는지 확인할 수 있어요."
        action={
          <Button variant="secondary" onClick={() => downloadCsv(rows)}>
            <Download className="h-4 w-4" />
            CSV 내보내기
          </Button>
        }
      />

      <Panel>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="relative sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setLimit(PAGE)
              }}
              placeholder="사용자, 도구 검색"
              className={`${inputClass} w-full pl-9`}
            />
          </div>
          <Segmented
            className="sm:w-60"
            options={[
              { value: 'all', label: '전체' },
              { value: 'ok', label: '성공' },
              { value: 'error', label: '실패' },
            ]}
            value={filter}
            onChange={(f) => {
              setFilter(f)
              setLimit(PAGE)
            }}
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
              {rows.slice(0, limit).map((l) => (
                <tr key={l.id} className="border-t border-slate-100 transition-colors hover:bg-sky-soft/40">
                  <td className="px-5 py-3 whitespace-nowrap">
                    <span className="font-mono text-xs text-slate-700">{fmtTime(l.at)}</span>
                    <span className="ml-2 text-xs text-slate-400">{timeAgo(l.at)}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-slate-800">{names.get(l.email) || l.email.split('@')[0]}</span>
                    <span className="ml-1.5 text-xs text-slate-400">{l.email}</span>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-navy">{l.tool}</td>
                  <td className="px-3 py-3 text-slate-600">{l.client}</td>
                  <td className="px-3 py-3 text-right text-slate-600 tabular-nums">{l.latency}ms</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={l.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="border-t border-slate-100 py-16 text-center text-sm text-slate-400">조건에 맞는 로그가 없어요.</p>}
        </div>

        {rows.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
            <span>
              {rows.length}건 중 {Math.min(limit, rows.length)}건 표시
            </span>
            {limit < rows.length && (
              <button type="button" onClick={() => setLimit((n) => n + PAGE)} className="font-semibold text-navy hover:underline">
                더 보기
              </button>
            )}
          </div>
        )}
      </Panel>
    </>
  )
}
