import { Check, Copy } from 'lucide-react'
import { MCP_URL } from '../lib/config'
import { fmtNum } from './format'
import type { Tool } from './mockData'
import { Badge, PageHeader, Panel, Toggle } from './ui'
import { useCopy } from './useCopy'

type Props = { tools: Tool[]; onToggle: (id: string) => void }

export default function ToolsPage({ tools, onToggle }: Props) {
  const enabled = tools.filter((t) => t.enabled).length
  const { copied, copy } = useCopy()

  return (
    <>
      <PageHeader title="MCP 도구" desc="사용자에게 공개할 도구를 켜고 끌 수 있어요. 끈 도구는 모든 클라이언트에서 바로 사라져요." />

      <Panel className="mb-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-x-10 gap-y-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
              <span className="text-sm font-semibold text-emerald-700">정상 운영 중</span>
            </div>
            <div className="mt-2 flex items-center gap-1">
              <code className="truncate font-mono text-sm text-navy-deep">{MCP_URL}</code>
              <button
                type="button"
                onClick={() => copy(MCP_URL)}
                aria-label="주소 복사"
                className="grid h-7 w-7 shrink-0 place-items-center rounded text-slate-400 transition hover:bg-sky-soft hover:text-navy"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
          <ServerStat label="공개 도구" value={`${enabled} / ${tools.length}`} />
          <ServerStat label="가동률(30일)" value="99.98%" />
          <ServerStat label="서버 버전" value="v0.1.0" />
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        {tools.map((t, i) => (
          <Panel key={t.id} delay={0.05 + i * 0.04} className={`p-5 transition-opacity ${t.enabled ? '' : 'opacity-60'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[15px] font-semibold text-navy-deep">{t.id}</span>
                  <Badge tone="sky">{t.category}</Badge>
                </div>
                <p className="mt-1.5 text-sm text-slate-500">{t.desc}</p>
              </div>
              <Toggle checked={t.enabled} onChange={() => onToggle(t.id)} label={`${t.id} 사용`} />
            </div>
            <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4 text-sm">
              <Metric label="호출(7일)" value={t.calls ? fmtNum(t.calls) : '-'} />
              <Metric label="평균 응답" value={t.latency ? `${t.latency}ms` : '-'} warn={t.latency > 800} />
              <Metric label="오류율" value={t.calls ? `${t.errorRate}%` : '-'} warn={t.errorRate >= 2} />
            </dl>
          </Panel>
        ))}
      </div>
    </>
  )
}

function ServerStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-navy-deep tabular-nums">{value}</p>
    </div>
  )
}

function Metric({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className={`mt-0.5 font-semibold tabular-nums ${warn ? 'text-amber-600' : 'text-slate-700'}`}>{value}</dd>
    </div>
  )
}
