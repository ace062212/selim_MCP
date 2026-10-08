import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, CircleCheck, KeyRound, LayoutDashboard, ScrollText, Settings as SettingsIcon, Wrench } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import logo from '../assets/selim-logo.png'
import Background from '../components/Background'
import { issueKey, revokeKey } from '../lib/keyStore'
import Dashboard from './Dashboard'
import KeysPage from './KeysPage'
import LogsPage from './LogsPage'
import { ACTIVITY, DEFAULT_SETTINGS, TOOLS, loadMembers, type Activity, type Member, type Settings } from './mockData'
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
  const [section, setSection] = useState(readSection)
  const [members, setMembers] = useState(loadMembers)
  const [tools, setTools] = useState(TOOLS)
  const [activity, setActivity] = useState(ACTIVITY)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    document.title = 'Selim MCP 관리자'
    const onHash = () => setSection(readSection())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const go = (id: SectionId) => {
    window.history.pushState(null, '', `#${id}`)
    setSection(id)
    window.scrollTo({ top: 0 })
  }

  const notify = useCallback((text: string, tone: Activity['tone'] = 'navy') => {
    setActivity((a) => [{ id: crypto.randomUUID(), text, at: new Date().toISOString(), tone }, ...a])
    setToast({ id: Date.now(), text })
    clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2400)
  }, [])

  const who = (email: string) => {
    const m = members.find((x) => x.email === email)
    return m?.name || email
  }

  const updateMember = (email: string, patch: Partial<Member>) =>
    setMembers((list) => list.map((m) => (m.email === email ? { ...m, ...patch } : m)))

  const toggleMember = (email: string) => {
    const m = members.find((x) => x.email === email)
    if (!m) return
    const next = m.status === 'active' ? 'suspended' : 'active'
    updateMember(email, { status: next })
    notify(next === 'active' ? `${who(email)}님의 키를 다시 활성화했어요` : `${who(email)}님의 키를 정지했어요`, next === 'active' ? 'sky' : 'rose')
  }

  const reissue = (email: string) => {
    const r = issueKey(email)
    updateMember(email, { key: r.key, issuedAt: r.issuedAt, status: 'active' })
    notify(`${who(email)}님의 키를 재발급했어요`)
  }

  const revoke = (email: string) => {
    revokeKey(email)
    setMembers((list) => list.filter((m) => m.email !== email))
    notify(`${who(email)}님의 키를 폐기했어요`, 'rose')
  }

  const issue = (email: string) => {
    const r = issueKey(email)
    const normalized = email.toLowerCase()
    setMembers((list) => [
      { email: normalized, name: '', dept: '', lastUsedAt: null, requests: 0, ...list.find((m) => m.email === normalized), key: r.key, issuedAt: r.issuedAt, status: 'active' },
      ...list.filter((m) => m.email !== normalized),
    ])
    notify(`${who(normalized)}님에게 키를 발급했어요`, 'sky')
    return r.key
  }

  const toggleTool = (id: string) => {
    const t = tools.find((x) => x.id === id)
    if (!t) return
    setTools((list) => list.map((x) => (x.id === id ? { ...x, enabled: !x.enabled } : x)))
    notify(`${id} 도구를 ${t.enabled ? '비활성화' : '활성화'}했어요`, t.enabled ? 'slate' : 'sky')
  }

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
            <span className="grid h-9 w-9 place-items-center rounded-full bg-navy text-sm font-semibold text-white">관</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800">관리자</p>
              <p className="truncate text-xs text-slate-500">{settings.admins[0]}</p>
            </div>
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
          <span className="text-[10px] font-semibold tracking-[0.3em] text-sky">MCP ADMIN</span>
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
              {section === 'dashboard' && <Dashboard members={members} tools={tools} activity={activity} />}
              {section === 'keys' && <KeysPage members={members} onToggle={toggleMember} onReissue={reissue} onRevoke={revoke} onIssue={issue} />}
              {section === 'tools' && <ToolsPage tools={tools} onToggle={toggleTool} />}
              {section === 'logs' && <LogsPage members={members} />}
              {section === 'settings' && (
                <SettingsPage
                  settings={settings}
                  onSave={(s: Settings) => {
                    setSettings(s)
                    notify('설정을 저장했어요')
                  }}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            className="fixed top-5 left-1/2 z-[60] flex items-center gap-2 rounded-full bg-navy-deep/95 py-2.5 pr-5 pl-4 text-sm text-white shadow-2xl shadow-navy/30 backdrop-blur"
            initial={{ opacity: 0, y: -16, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -10, x: '-50%' }}
          >
            <CircleCheck className="h-4 w-4 text-sky" />
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
