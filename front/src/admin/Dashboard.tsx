import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { AreaChart, Sparkline } from './charts'
import { fmtNum, timeAgo } from './format'
import { CLIENTS, DAILY, LOGS, type Activity, type Member, type Tool } from './mockData'
import { CountUp, PageHeader, Panel, PanelTitle } from './ui'

const DOT = { navy: 'bg-navy', sky: 'bg-sky', amber: 'bg-amber-500', rose: 'bg-rose-500', slate: 'bg-slate-400' }
const CLIENT_COLORS = ['bg-navy', 'bg-sky', 'bg-slate-300']

type Props = { members: Member[]; tools: Tool[]; activity: Activity[] }

export default function Dashboard({ members, tools, activity }: Props) {
  const active = members.filter((m) => m.status === 'active').length
  const suspended = members.length - active

  const today = DAILY[DAILY.length - 1].value
  const lastWeek = DAILY[DAILY.length - 8].value
  const change = Math.round(((today - lastWeek) / lastWeek) * 100)

  const enabled = tools.filter((t) => t.enabled)
  const totalCalls = enabled.reduce((s, t) => s + t.calls, 0)
  const avgLatency = Math.round(enabled.reduce((s, t) => s + t.latency * t.calls, 0) / (totalCalls || 1))
  const errorRate = (LOGS.filter((l) => l.status >= 400).length / LOGS.length) * 100

  const topTools = [...enabled].sort((a, b) => b.calls - a.calls).slice(0, 5)
  const clientCounts = CLIENTS.map((c) => LOGS.filter((l) => l.client === c).length)

  return (
    <>
      <PageHeader title="대시보드" desc="사내 MCP 사용 현황을 한눈에 확인하세요." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat delay={0} label="활성 API 키" value={<CountUp value={active} />} unit="개" note={`정지 ${suspended}개 · 전체 ${members.length}개`} />
        <Stat
          delay={0.05}
          label="오늘 요청"
          value={<CountUp value={today} />}
          unit="건"
          note={
            <span className={change >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
              {change >= 0 ? '▲' : '▼'} {Math.abs(change)}% <span className="text-slate-400">지난주 대비</span>
            </span>
          }
          spark={DAILY.map((d) => d.value)}
        />
        <Stat delay={0.1} label="평균 응답 시간" value={<CountUp value={avgLatency} />} unit="ms" note="최근 7일 · 호출 수 가중 평균" />
        <Stat
          delay={0.15}
          label="오류율"
          value={<CountUp value={errorRate} decimals={1} />}
          unit="%"
          note={errorRate > 5 ? <span className="text-rose-600">기준치(5%) 초과</span> : '기준치(5%) 이내'}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel delay={0.2} className="p-6 xl:col-span-2">
          <PanelTitle title="일별 요청 수" desc="최근 14일" />
          <AreaChart data={DAILY} />
        </Panel>

        <Panel delay={0.25} className="p-6">
          <PanelTitle title="많이 쓰는 도구" desc="최근 7일 호출 수" />
          <ul className="space-y-4">
            {topTools.map((t, i) => (
              <li key={t.id}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-mono text-[13px] text-slate-700">{t.id}</span>
                  <span className="text-slate-500 tabular-nums">{fmtNum(t.calls)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-navy to-sky"
                    initial={{ width: 0 }}
                    animate={{ width: `${(t.calls / topTools[0].calls) * 100}%` }}
                    transition={{ delay: 0.4 + i * 0.07, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel delay={0.3} className="p-6 xl:col-span-2">
          <PanelTitle title="최근 활동" />
          <ul className="divide-y divide-slate-100">
            {activity.slice(0, 6).map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[a.tone]}`} />
                <span className="flex-1 text-sm text-slate-700">{a.text}</span>
                <span className="shrink-0 text-xs text-slate-400">{timeAgo(a.at)}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel delay={0.35} className="p-6">
          <PanelTitle title="접속 클라이언트" desc="최근 요청 기준" />
          <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
            {clientCounts.map((n, i) => (
              <motion.div
                key={CLIENTS[i]}
                className={`h-full ${CLIENT_COLORS[i]} ${i ? 'border-l-2 border-white' : ''}`}
                initial={{ width: 0 }}
                animate={{ width: `${(n / LOGS.length) * 100}%` }}
                transition={{ delay: 0.5 + i * 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              />
            ))}
          </div>
          <ul className="mt-5 space-y-3">
            {CLIENTS.map((c, i) => (
              <li key={c} className="flex items-center gap-2.5 text-sm">
                <span className={`h-2.5 w-2.5 rounded-sm ${CLIENT_COLORS[i]}`} />
                <span className="flex-1 text-slate-700">{c}</span>
                <span className="font-semibold text-navy-deep tabular-nums">{Math.round((clientCounts[i] / LOGS.length) * 100)}%</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  )
}

function Stat({
  label,
  value,
  unit,
  note,
  spark,
  delay,
}: {
  label: string
  value: ReactNode
  unit: string
  note: ReactNode
  spark?: number[]
  delay: number
}) {
  return (
    <Panel delay={delay} className="p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="text-3xl font-bold tracking-tight text-navy-deep tabular-nums">
          {value}
          <span className="ml-1 text-base font-medium text-slate-400">{unit}</span>
        </p>
        {spark && <Sparkline values={spark} />}
      </div>
      <p className="mt-2 text-xs text-slate-500">{note}</p>
    </Panel>
  )
}
