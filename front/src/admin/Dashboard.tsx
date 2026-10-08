import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { api } from '../lib/api'
import { describeActivity } from './activity'
import { AreaChart, Sparkline } from './charts'
import { fmtNum, timeAgo } from './format'
import { CountUp, LoadError, PageHeader, Panel, PanelTitle } from './ui'
import { useLoad } from './useLoad'

const DOT = { navy: 'bg-navy', sky: 'bg-sky', amber: 'bg-amber-500', rose: 'bg-rose-500', slate: 'bg-slate-400' }
const CLIENT_COLORS = ['bg-navy', 'bg-sky', 'bg-slate-300', 'bg-slate-200']

export default function Dashboard() {
  const { data: stats, error } = useLoad(api.admin.stats)
  const { data: activity } = useLoad(() => api.admin.activity(8))

  if (error) return <LoadError message={error} />

  return (
    <>
      <PageHeader title="대시보드" desc="사내 MCP 사용 현황을 한눈에 확인하세요." />
      {!stats ? <Skeleton /> : <Content stats={stats} activity={activity ?? []} />}
    </>
  )
}

function Content({ stats, activity }: { stats: Awaited<ReturnType<typeof api.admin.stats>>; activity: Awaited<ReturnType<typeof api.admin.activity>> }) {
  const { keys, daily, avgLatency, errorRate, topTools, clients } = stats
  const today = daily[daily.length - 1]?.value ?? 0
  const lastWeek = daily[daily.length - 8]?.value ?? 0
  const change = lastWeek ? Math.round(((today - lastWeek) / lastWeek) * 100) : null
  const clientTotal = clients.reduce((s, c) => s + c.calls, 0)

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat delay={0} label="활성 API 키" value={<CountUp value={keys.active} />} unit="개" note={`정지 ${keys.suspended}개 · 전체 ${keys.total}개`} />
        <Stat
          delay={0.05}
          label="오늘 요청"
          value={<CountUp value={today} />}
          unit="건"
          note={
            change === null ? (
              '지난주 같은 요일 기록 없음'
            ) : (
              <span className={change >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                {change >= 0 ? '▲' : '▼'} {Math.abs(change)}% <span className="text-slate-400">지난주 대비</span>
              </span>
            )
          }
          spark={daily.map((d) => d.value)}
        />
        <Stat delay={0.1} label="평균 응답 시간" value={<CountUp value={avgLatency} />} unit="ms" note="최근 7일 · 성공한 호출 기준" />
        <Stat
          delay={0.15}
          label="오류율"
          value={<CountUp value={errorRate} decimals={1} />}
          unit="%"
          note={errorRate > 5 ? <span className="text-rose-600">최근 7일 · 기준치(5%) 초과</span> : '최근 7일 · 기준치(5%) 이내'}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel delay={0.2} className="p-6 xl:col-span-2">
          <PanelTitle title="일별 요청 수" desc="최근 14일 · 도구 호출 기준" />
          <AreaChart data={daily} />
        </Panel>

        <Panel delay={0.25} className="p-6">
          <PanelTitle title="많이 쓰는 도구" desc="최근 7일 호출 수" />
          {topTools.length === 0 ? (
            <Empty>아직 호출 기록이 없어요.</Empty>
          ) : (
            <ul className="space-y-4">
              {topTools.map((t, i) => (
                <li key={t.name}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-mono text-[13px] text-slate-700">{t.name}</span>
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
          )}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel delay={0.3} className="p-6 xl:col-span-2">
          <PanelTitle title="최근 활동" />
          {activity.length === 0 ? (
            <Empty>아직 활동 기록이 없어요.</Empty>
          ) : (
            <ul className="divide-y divide-slate-100">
              {activity.map((a) => {
                const { text, tone } = describeActivity(a)
                return (
                  <li key={a.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[tone]}`} />
                    <span className="min-w-0 flex-1 text-sm break-all text-slate-700">{text}</span>
                    <span className="shrink-0 text-xs text-slate-400">{timeAgo(a.at)}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>

        <Panel delay={0.35} className="p-6">
          <PanelTitle title="접속 클라이언트" desc="최근 7일 호출 기준" />
          {clientTotal === 0 ? (
            <Empty>아직 호출 기록이 없어요.</Empty>
          ) : (
            <>
              <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
                {clients.map((c, i) => (
                  <motion.div
                    key={c.name}
                    className={`h-full ${CLIENT_COLORS[i] ?? 'bg-slate-200'} ${i ? 'border-l-2 border-white' : ''}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${(c.calls / clientTotal) * 100}%` }}
                    transition={{ delay: 0.5 + i * 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  />
                ))}
              </div>
              <ul className="mt-5 space-y-3">
                {clients.map((c, i) => (
                  <li key={c.name} className="flex items-center gap-2.5 text-sm">
                    <span className={`h-2.5 w-2.5 rounded-sm ${CLIENT_COLORS[i] ?? 'bg-slate-200'}`} />
                    <span className="min-w-0 flex-1 truncate text-slate-700">{c.name}</span>
                    <span className="font-semibold text-navy-deep tabular-nums">{Math.round((c.calls / clientTotal) * 100)}%</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>
      </div>
    </>
  )
}

function Stat({ label, value, unit, note, spark, delay }: { label: string; value: ReactNode; unit: string; note: ReactNode; spark?: number[]; delay: number }) {
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

function Empty({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center text-sm text-slate-400">{children}</p>
}

function Skeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-[132px] animate-pulse rounded-lg bg-white/60 ring-1 ring-slate-900/5" />
      ))}
      <div className="h-80 animate-pulse rounded-lg bg-white/60 ring-1 ring-slate-900/5 sm:col-span-2 xl:col-span-4" />
    </div>
  )
}
