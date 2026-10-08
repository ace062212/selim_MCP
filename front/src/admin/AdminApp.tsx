import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, CircleAlert, CircleCheck, KeyRound, LayoutDashboard, LogOut, ScrollText, Settings as SettingsIcon, Wrench } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import logo from '../assets/selim-logo.png'
import Background from '../components/Background'
import { ADMIN_UNAUTHORIZED, api } from '../lib/api'
import AdminLogin from './AdminLogin'
import Dashboard from './Dashboard'
import KeysPage from './KeysPage'
import LogsPage from './LogsPage'
import type { Notify } from './notify'
import SettingsPage from './SettingsPage'
import ToolsPage from './ToolsPage'

const SECTIONS = [
  { id: 'dashboard', label: '대시보드', icon: LayoutDashboard },
  { id: 'keys', label: 'API 키', icon: KeyRound },
  { id: 'tools', label: 'MCP 도구', icon: Wrench },
  { id: 'logs', label: '사용 로그', icon: ScrollText },
  { id: 'settings', label: '설정', icon: SettingsIcon },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

// 새로고침해도 보던 메뉴가 유지되도록 주소의 #으로 메뉴를 관리
function readSection(): SectionId {
  const hash = window.location.hash.slice(1)
  return SECTIONS.find((s) => s.id === hash)?.id ?? 'dashboard'
}

export default function AdminApp() {
  // undefined: 확인 중, null: 로그인 필요
  const [admin, setAdmin] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    document.title = 'Selim MCP 관리자'
    api.session('admin').then(
      (s) => setAdmin(s.email),
      () => setAdmin(null),
    )
    // 관리자 API가 401/403이면 로그인 화면으로
    const onUnauthorized = () => setAdmin(null)
    window.addEventListener(ADMIN_UNAUTHORIZED, onUnauthorized)
    return () => window.removeEventListener(ADMIN_UNAUTHORIZED, onUnauthorized)
  }, [])

  if (admin === undefined) return <Background />
  if (admin === null) return <AdminLogin onLogin={setAdmin} />
  return (
    <Console
      email={admin}
      onLogout={() => {
        void api.logout('admin').catch(() => {})
        setAdmin(null)
      }}
    />
  )
}

function Console({ email, onLogout }: { email: string; onLogout: () => void }) {
  const [section, setSection] = useState(readSection)
  const [toast, setToast] = useState<{ id: number; text: string; tone: 'ok' | 'error' } | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    const onHash = () => setSection(readSection())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const go = (id: SectionId) => {
    window.history.pushState(null, '', `#${id}`)
    setSection(id)
    window.scrollTo({ top: 0 })
  }

  const notify: Notify = useCallback((text, tone = 'ok') => {
    setToast({ id: Date.now(), text, tone })
    clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2600)
  }, [])

  return (
    <div className="min-h-full">
      <Background />

      {/* 데스크톱 사이드바 */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/60 bg-white/60 shadow-xl shadow-navy/5 backdrop-blur-xl lg:flex">
        <div className="px-6 pt-8 pb-7">
          <img src={logo} alt="세림티에스지" className="h-12 w-auto" />
          <p className="mt-4 text-[11px] font-semibold tracking-[0.35em] text-sky">MCP ADMIN</p>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => go(s.id)}
              className={`relative flex w-full items-center gap-3 rounded-md px-3.5 py-2.5 text-sm font-medium transition-colors ${
                section === s.id ? 'text-white' : 'text-slate-600 hover:bg-white/70 hover:text-navy'
              }`}
            >
              {section === s.id && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-md bg-navy shadow-lg shadow-navy/25"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
              <s.icon className="relative h-[18px] w-[18px]" />
              <span className="relative">{s.label}</span>
            </button>
          ))}
        </nav>
        <div className="border-t border-slate-200/70 p-4">
          <div className="flex items-center gap-3 px-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy text-sm font-semibold text-white">
              {email[0].toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800">관리자</p>
              <p className="truncate text-xs text-slate-500">{email}</p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              title="로그아웃"
              aria-label="로그아웃"
              className="grid h-8 w-8 place-items-center rounded-md text-slate-400 transition hover:bg-white/70 hover:text-navy"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          <a
            href="/"
            className="mt-3 flex items-center justify-between rounded-md px-3 py-2 text-xs font-medium text-slate-500 transition hover:bg-white/70 hover:text-navy"
          >
            사용자 페이지로 이동
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </aside>

      {/* 모바일 상단 바 */}
      <header className="sticky top-0 z-30 border-b border-white/60 bg-white/70 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between px-4 pt-3">
          <img src={logo} alt="세림티에스지" className="h-8 w-auto" />
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold tracking-[0.3em] text-sky">MCP ADMIN</span>
            <button type="button" onClick={onLogout} aria-label="로그아웃" className="grid h-8 w-8 place-items-center rounded-md text-slate-400">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 py-2.5 [scrollbar-width:none]">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => go(s.id)}
              className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                section === s.id ? 'bg-navy text-white shadow-md shadow-navy/20' : 'text-slate-600'
              }`}
            >
              {s.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 lg:py-12">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={section}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              {section === 'dashboard' && <Dashboard />}
              {section === 'keys' && <KeysPage notify={notify} />}
              {section === 'tools' && <ToolsPage notify={notify} />}
              {section === 'logs' && <LogsPage />}
              {section === 'settings' && <SettingsPage notify={notify} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            className="fixed top-5 left-1/2 z-[60] flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full bg-navy-deep/95 py-2.5 pr-5 pl-4 text-sm text-white shadow-2xl shadow-navy/30 backdrop-blur"
            initial={{ opacity: 0, y: -16, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -10, x: '-50%' }}
          >
            {toast.tone === 'ok' ? <CircleCheck className="h-4 w-4 shrink-0 text-sky" /> : <CircleAlert className="h-4 w-4 shrink-0 text-rose-300" />}
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
