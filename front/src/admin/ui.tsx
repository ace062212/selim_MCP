import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { fmtNum } from './format'

export function Panel({ className = '', delay = 0, children }: { className?: string; delay?: number; children: ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`min-w-0 rounded-lg border border-white/60 bg-white/75 shadow-xl shadow-navy/5 ring-1 ring-slate-900/5 backdrop-blur-xl ${className}`}
    >
      {children}
    </motion.section>
  )
}

export function PanelTitle({ title, desc, action }: { title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h3 className="font-semibold text-navy-deep">{title}</h3>
        {desc && <p className="mt-0.5 text-xs text-slate-500">{desc}</p>}
      </div>
      {action}
    </div>
  )
}

export function PageHeader({ title, desc, action }: { title: string; desc: string; action?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy-deep sm:text-[1.7rem]">{title}</h1>
        <p className="mt-1.5 text-sm text-slate-500">{desc}</p>
      </div>
      {action}
    </div>
  )
}

const TONES = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/15',
  rose: 'bg-rose-50 text-rose-700 ring-rose-600/15',
  sky: 'bg-sky-soft text-navy ring-navy/10',
  slate: 'bg-slate-100 text-slate-600 ring-slate-500/15',
}

export function Badge({ tone, dot, children }: { tone: keyof typeof TONES; dot?: boolean; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset ${TONES[tone]}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

type Variant = 'primary' | 'secondary' | 'danger'
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-navy text-white shadow-md shadow-navy/20 hover:bg-navy-deep',
  secondary: 'border border-slate-200 bg-white/80 text-slate-700 hover:border-slate-300 hover:bg-white',
  danger: 'bg-rose-600 text-white shadow-md shadow-rose-600/20 hover:bg-rose-700',
}

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; children: ReactNode }) {
  return (
    <button
      type="button"
      {...rest}
      className={`group relative inline-flex h-10 items-center justify-center gap-1.5 overflow-hidden rounded-md px-4 text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
    >
      {variant !== 'secondary' && (
        <span className="absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-all duration-700 group-hover:left-full" />
      )}
      {children}
    </button>
  )
}

export function IconButton({ label, tone = 'default', children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; tone?: 'default' | 'danger' }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      {...rest}
      className={`grid h-8 w-8 place-items-center rounded-md text-slate-400 transition ${
        tone === 'danger' ? 'hover:bg-rose-50 hover:text-rose-600' : 'hover:bg-sky-soft hover:text-navy'
      }`}
    >
      {children}
    </button>
  )
}

export function CountUp({ value, decimals = 0, suffix = '' }: { value: number; decimals?: number; suffix?: string }) {
  const mv = useMotionValue(0)
  const text = useTransform(mv, (v) => (decimals ? v.toFixed(decimals) : fmtNum(Math.round(v))) + suffix)
  useEffect(() => {
    const controls = animate(mv, value, { duration: 1.1, ease: [0.22, 1, 0.36, 1] })
    return () => controls.stop()
  }, [mv, value])
  return <motion.span>{text}</motion.span>
}

export function Modal({
  open,
  onClose,
  title,
  desc,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  desc?: ReactNode
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-navy-deep/30 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal
            className="relative w-full max-w-md rounded-lg border border-white/60 bg-white/90 p-6 shadow-2xl shadow-navy/20 ring-1 ring-slate-900/5 backdrop-blur-xl sm:p-7"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <h3 className="text-lg font-bold text-navy-deep">{title}</h3>
            {desc && <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{desc}</p>}
            <div className="mt-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function ConfirmModal({
  open,
  title,
  desc,
  confirmLabel,
  danger,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  desc: ReactNode
  confirmLabel: string
  danger?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} desc={desc}>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          취소
        </Button>
        <Button
          variant={danger ? 'danger' : 'primary'}
          onClick={() => {
            onConfirm()
            onClose()
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}

export function LoadError({ message }: { message: string }) {
  return (
    <Panel className="p-10 text-center">
      <p className="font-semibold text-navy-deep">데이터를 불러오지 못했어요</p>
      <p className="mt-1.5 text-sm text-slate-500">{message}</p>
    </Panel>
  )
}
