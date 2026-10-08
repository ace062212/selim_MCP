import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

export function PrimaryButton({
  loading,
  children,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; children: ReactNode }) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={`group relative inline-flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-md bg-navy px-5 font-semibold text-white shadow-lg shadow-navy/25 transition hover:bg-navy-deep active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {/* hover 시 빛이 스치는 효과 */}
      <span className="absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-all duration-700 group-hover:left-full" />
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : children}
    </button>
  )
}

export function StepHeader({ title, desc }: { title: string; desc: ReactNode }) {
  return (
    <div className="mb-7 text-center">
      <h2 className="text-2xl font-bold tracking-tight text-navy-deep">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">{desc}</p>
    </div>
  )
}

// 같은 폭의 칸 사이를 흰색 표시가 좌우로 미끄러지는 토글
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  disabled,
  size = 'md',
  className = '',
}: {
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  disabled?: boolean
  size?: 'sm' | 'md'
  className?: string
}) {
  const index = options.findIndex((o) => o.value === value)
  const pad = size === 'sm' ? 'p-0.5' : 'p-1'
  return (
    <div
      className={`relative grid rounded-md bg-slate-100 ${pad} ${size === 'sm' ? 'text-xs' : 'text-sm'} ${className}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <div className={`pointer-events-none absolute inset-0 ${pad}`}>
        <div className="relative h-full">
          <motion.span
            className="absolute inset-y-0 left-0 rounded bg-white shadow-sm"
            style={{ width: `${100 / options.length}%` }}
            initial={false}
            animate={{ x: `${index * 100}%` }}
            transition={{ type: 'spring', stiffness: 500, damping: 38 }}
          />
        </div>
      </div>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(o.value)}
          className={`relative font-medium whitespace-nowrap transition ${size === 'sm' ? 'px-2.5 py-1' : 'py-2'} ${
            o.value === value ? 'text-navy' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
