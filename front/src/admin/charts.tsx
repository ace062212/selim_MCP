import { motion } from 'framer-motion'
import { useState, type MouseEvent } from 'react'
import { fmtCompact, fmtNum } from './format'

type Point = { label: string; value: number }

const W = 600
const H = 200

function niceMax(max: number) {
  if (max < 10) return 10
  const step = 10 ** Math.floor(Math.log10(max))
  return (Math.ceil((max / step) * 2) / 2) * step
}

// 점 사이를 부드러운 곡선으로 연결
function smoothPath(pts: [number, number][]) {
  return pts.reduce((d, [x, y], i) => {
    if (i === 0) return `M${x},${y}`
    const [px, py] = pts[i - 1]
    const mx = (px + x) / 2
    return `${d} C${mx},${py} ${mx},${y} ${x},${y}`
  }, '')
}

export function AreaChart({ data }: { data: Point[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = niceMax(Math.max(...data.map((d) => d.value)))
  const pts = data.map((d, i): [number, number] => [(i / (data.length - 1)) * W, H - (d.value / max) * H])
  const line = smoothPath(pts)
  const ticks = [0, 0.25, 0.5, 0.75, 1]

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const i = Math.round(((e.clientX - rect.left) / rect.width) * (data.length - 1))
    setHover(Math.max(0, Math.min(data.length - 1, i)))
  }

  const h = hover === null ? null : data[hover]
  const hx = hover === null ? 0 : (hover / (data.length - 1)) * 100

  return (
    <div className="flex gap-3">
      <div className="relative h-52 w-8 shrink-0 text-right text-[11px] text-slate-400 tabular-nums">
        {ticks.map((f) => (
          <span key={f} className="absolute right-0 -translate-y-1/2" style={{ top: `${(1 - f) * 100}%` }}>
            {fmtCompact(max * f)}
          </span>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <div className="relative h-52" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
            {ticks.map((f) => (
              <line key={f} x1={0} x2={W} y1={H - f * H} y2={H - f * H} stroke="#e2e8f0" strokeDasharray={f ? '4 4' : undefined} vectorEffect="non-scaling-stroke" />
            ))}
          </svg>
          {/* 왼쪽부터 그려지듯 드러남 */}
          <motion.div
            className="absolute inset-0"
            initial={{ clipPath: 'inset(0 100% 0 0)' }}
            animate={{ clipPath: 'inset(0 0% 0 0)' }}
            transition={{ duration: 1.3, ease: [0.65, 0, 0.35, 1], delay: 0.2 }}
          >
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full overflow-visible">
              <defs>
                <linearGradient id="area-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#72aadc" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#72aadc" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={`${line} L${W},${H} L0,${H} Z`} fill="url(#area-fill)" />
              <path d={line} fill="none" stroke="#16437a" strokeWidth={2.5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </svg>
          </motion.div>

          {h && (
            <>
              <div className="pointer-events-none absolute inset-y-0 w-px bg-navy/20" style={{ left: `${hx}%` }} />
              <div
                className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-navy shadow ring-4 ring-sky/30"
                style={{ left: `${hx}%`, top: `${(1 - h.value / max) * 100}%` }}
              />
              <div
                className="pointer-events-none absolute -top-2 rounded-md bg-navy-deep px-2.5 py-1.5 text-xs whitespace-nowrap text-white shadow-lg"
                style={{
                  left: `${hx}%`,
                  transform: `translate(${hover === 0 ? '0' : hover === data.length - 1 ? '-100%' : '-50%'}, -100%)`,
                }}
              >
                <span className="text-sky-200/80">{h.label}</span> <span className="font-semibold">{fmtNum(h.value)}건</span>
              </div>
            </>
          )}
        </div>
        <div className="relative mt-2 h-4 text-[11px] text-slate-400 tabular-nums">
          {data.map((d, i) => (
            <span
              key={d.label}
              className={`absolute top-0 ${i % 2 ? 'hidden sm:block' : ''}`}
              style={{
                left: `${(i / (data.length - 1)) * 100}%`,
                transform: `translateX(${i === 0 ? '0' : i === data.length - 1 ? '-100%' : '-50%'})`,
              }}
            >
              {d.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values)
  const min = Math.min(...values)
  const pts = values.map((v, i): [number, number] => [(i / (values.length - 1)) * 100, 30 - ((v - min) / (max - min || 1)) * 26 - 2])
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-8 w-24" aria-hidden>
      <path d={smoothPath(pts)} fill="none" stroke="#72aadc" strokeWidth={2} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
