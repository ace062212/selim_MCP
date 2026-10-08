import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { CLIENT_GROUPS, MCP_CLIENTS } from '../lib/clients'

const MENU_WIDTH = 248
const GAP = 6

// 클라이언트 고르는 드롭다운 (터미널 / 앱·에디터 묶음)
// 카드가 overflow-hidden + backdrop-blur라 목록이 잘리지 않도록 body에 띄움
export default function ClientSelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(value)
  const [pos, setPos] = useState<{ top: number; left: number; up: boolean } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const current = MCP_CLIENTS.find((c) => c.id === value) ?? MCP_CLIENTS[0]
  // 화면에 보이는 순서 (묶음 순서대로)
  const ordered = CLIENT_GROUPS.flatMap((g) => MCP_CLIENTS.filter((c) => c.group === g.id))

  // 버튼 위치 기준으로 목록 자리 계산. 아래 공간이 부족하면 위로 펼침
  const place = () => {
    const r = triggerRef.current?.getBoundingClientRect()
    if (!r) return
    const menuHeight = menuRef.current?.offsetHeight ?? 300
    const up = r.bottom + GAP + menuHeight > window.innerHeight && r.top - GAP - menuHeight > 0
    const left = Math.min(Math.max(8, r.right - MENU_WIDTH), window.innerWidth - MENU_WIDTH - 8)
    setPos({ top: up ? r.top - GAP : r.bottom + GAP, left, up })
  }

  useLayoutEffect(() => {
    if (open) place()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (!menuRef.current?.contains(t) && !triggerRef.current?.contains(t)) setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  const openMenu = () => {
    setActive(value)
    setOpen(true)
  }

  const pick = (id: string) => {
    onChange(id)
    setOpen(false)
    triggerRef.current?.focus()
  }

  const onKeyDown = (e: KeyboardEvent) => {
    const i = ordered.findIndex((c) => c.id === active)
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault()
        openMenu()
      }
      return
    }
    if (e.key === 'ArrowDown') setActive(ordered[(i + 1) % ordered.length].id)
    else if (e.key === 'ArrowUp') setActive(ordered[(i - 1 + ordered.length) % ordered.length].id)
    else if (e.key === 'Home') setActive(ordered[0].id)
    else if (e.key === 'End') setActive(ordered[ordered.length - 1].id)
    else if (e.key === 'Enter' || e.key === ' ') pick(active)
    else if (e.key === 'Escape' || e.key === 'Tab') return setOpen(false)
    else return
    e.preventDefault()
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        aria-label={`사용하는 프로그램: ${current.label}`}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
        className={`inline-flex h-9 items-center gap-2 rounded-md border bg-white/80 pr-2.5 pl-3 text-sm font-medium text-navy-deep outline-none transition hover:border-slate-300 focus-visible:border-sky focus-visible:ring-4 focus-visible:ring-sky/20 ${
          open ? 'border-sky ring-4 ring-sky/20' : 'border-slate-200'
        }`}
      >
        {current.label}
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="text-slate-400">
          <ChevronDown className="h-4 w-4" />
        </motion.span>
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={menuRef}
              id={listId}
              role="listbox"
              aria-label="사용하는 프로그램"
              initial={{ opacity: 0, scale: 0.96, y: pos?.up ? 6 : -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.1 } }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: 'fixed',
                width: MENU_WIDTH,
                left: pos?.left ?? -9999,
                top: pos?.top ?? -9999,
                translate: pos?.up ? '0 -100%' : undefined,
                transformOrigin: pos?.up ? 'bottom right' : 'top right',
              }}
              className="z-[70] rounded-lg border border-white/70 bg-white/95 p-1.5 shadow-2xl shadow-navy/15 ring-1 ring-slate-900/5 backdrop-blur-xl"
            >
              {CLIENT_GROUPS.map((g, gi) => (
                <div key={g.id} role="group" aria-label={g.label} className={gi ? 'mt-1 border-t border-slate-100 pt-1' : ''}>
                  <div className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold tracking-wide text-slate-400">{g.label}</div>
                  {MCP_CLIENTS.filter((c) => c.group === g.id).map((c) => {
                    const selected = c.id === value
                    return (
                      <div
                        key={c.id}
                        id={`${listId}-${c.id}`}
                        role="option"
                        aria-selected={selected}
                        onMouseEnter={() => setActive(c.id)}
                        onClick={() => pick(c.id)}
                        className={`flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors ${
                          selected ? 'bg-sky-soft font-semibold text-navy' : c.id === active ? 'bg-slate-100/80 text-slate-800' : 'text-slate-700'
                        }`}
                      >
                        <span className="flex-1">{c.label}</span>
                        <span className={`text-[11px] ${c.hint.includes('.') ? 'font-mono' : ''} ${selected ? 'text-navy/60' : 'text-slate-400'}`}>{c.hint}</span>
                        <Check className={`h-3.5 w-3.5 shrink-0 ${selected ? 'text-navy' : 'invisible'}`} />
                      </div>
                    )
                  })}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}
