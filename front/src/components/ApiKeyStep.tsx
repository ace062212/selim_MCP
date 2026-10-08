import { AnimatePresence, motion } from 'framer-motion'
import { Check, Copy, Eye, EyeOff, RotateCcw, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { api, errorMessage, type IssuedKey, type KeyInfo } from '../lib/api'
import { MCP_URL } from '../lib/config'
import { PrimaryButton, Segmented } from './ui'

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null)
  const copy = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied((c) => (c === id ? null : c)), 1600)
  }
  return { copied, copy }
}

function CopyButton({ id, text, copied, copy }: { id: string; text: string } & ReturnType<typeof useCopy>) {
  const done = copied === id
  return (
    <button
      type="button"
      onClick={() => copy(id, text)}
      aria-label="복사"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-slate-400 transition hover:bg-white/10 hover:text-white"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={done ? 'done' : 'copy'}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {done ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}

const TABS = ['Claude Code', 'Claude Desktop / Cursor'] as const
const TAB_OPTIONS = TABS.map((t) => ({ value: t, label: t }))
const KEY_PLACEHOLDER = '<API_KEY>'

const STEPS = [
  { title: 'API 키 보관', desc: '키는 외부에 공유하지 마세요. 원문은 발급 직후에만 볼 수 있고, 잊어버리면 재발급하면 돼요.' },
  { title: 'MCP 클라이언트에 등록', desc: '사용하는 도구에 맞는 설정을 복사해서 붙여 넣으세요.' },
  { title: '바로 사용', desc: "AI 도구에서 사내 시스템을 바로 불러와 쓸 수 있어요. 쓸 도구는 '도구 설정'에서 고를 수 있어요." },
]

const formatDate = (iso: string) => new Date(iso).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })

const isIssued = (k: KeyInfo | IssuedKey): k is IssuedKey => 'key' in k

type Props = {
  email: string
  keyInfo: KeyInfo | IssuedKey | null
  onKeyChange: (key: IssuedKey) => void
  onReset: () => void
}

export default function ApiKeyStep({ email, keyInfo, onKeyChange, onReset }: Props) {
  const [issuing, setIssuing] = useState(false)
  const [error, setError] = useState('')

  const issue = async () => {
    setIssuing(true)
    setError('')
    try {
      onKeyChange(await api.issueMyKey())
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setIssuing(false)
    }
  }

  if (!keyInfo) return <NoKey email={email} issuing={issuing} error={error} onIssue={issue} onReset={onReset} />
  if (isIssued(keyInfo)) return <IssuedView email={email} issued={keyInfo} onReset={onReset} />
  return <SavedView email={email} info={keyInfo} issuing={issuing} error={error} onReissue={issue} onReset={onReset} />
}

// 조회했는데 발급된 키가 없을 때
function NoKey({ email, issuing, error, onIssue, onReset }: { email: string; issuing: boolean; error: string; onIssue: () => void; onReset: () => void }) {
  return (
    <div>
      <div className="mb-7 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-navy-deep">발급된 키가 없어요</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          <span className="font-semibold text-navy">{email}</span> 으로 발급된 API 키를 찾지 못했어요.
          <br />
          인증은 이미 끝났으니 바로 발급받을 수 있어요.
        </p>
      </div>
      <PrimaryButton type="button" loading={issuing} onClick={onIssue}>
        지금 발급받기
      </PrimaryButton>
      {error && <p className="mt-3 text-center text-sm text-rose-500">{error}</p>}
      <ResetButton onReset={onReset} />
    </div>
  )
}

function ResetButton({ onReset }: { onReset: () => void }) {
  return (
    <button
      type="button"
      onClick={onReset}
      className="mt-7 inline-flex w-full items-center justify-center gap-1.5 text-sm text-slate-500 transition hover:text-navy"
    >
      <RotateCcw className="h-3.5 w-3.5" /> 처음으로
    </button>
  )
}

// 발급 직후: 원문을 이번 한 번만 보여줌
function IssuedView({ email, issued, onReset }: { email: string; issued: IssuedKey; onReset: () => void }) {
  const [show, setShow] = useState(false)
  const clip = useCopy()

  return (
    <div>
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-navy-deep">발급 완료!</h2>
        <p className="mt-2 text-sm text-slate-500">
          <span className="font-semibold text-navy">{email}</span> 님의 MCP API 키가 발급됐어요.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-5 flex gap-2.5 rounded-md border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-800"
      >
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          <b>이 화면을 벗어나면 키를 다시 볼 수 없어요.</b> 지금 복사해서 안전한 곳에 보관하거나 바로 등록해 주세요.
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="mb-2 text-sm font-medium text-slate-700">API 키</div>
        <div className="flex items-center gap-1 rounded-md bg-navy-deep py-2 pr-2 pl-4 shadow-inner">
          <code className="min-w-0 flex-1 font-mono text-sm break-all text-sky-100">{show ? issued.key : issued.masked}</code>
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? '숨기기' : '보기'}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
          <CopyButton id="key" text={issued.key} {...clip} />
        </div>
      </motion.div>

      <Snippets apiKey={issued.key} display={show ? issued.key : issued.masked} clip={clip} />
      <HowTo />
      <ResetButton onReset={onReset} />
    </div>
  )
}

// 내 키 조회: 원문은 저장하지 않으므로 가려진 키와 정보만
function SavedView({
  email,
  info,
  issuing,
  error,
  onReissue,
  onReset,
}: {
  email: string
  info: KeyInfo
  issuing: boolean
  error: string
  onReissue: () => void
  onReset: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const clip = useCopy()

  return (
    <div>
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-navy-deep">내 API 키</h2>
        <p className="mt-2 text-sm text-slate-500">
          <span className="font-semibold text-navy">{email}</span> 님의 키 정보예요.
        </p>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">API 키</span>
          {info.status === 'suspended' ? (
            <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-600/15 ring-inset">
              관리자가 정지함
            </span>
          ) : (
            <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-600/15 ring-inset">
              사용 중
            </span>
          )}
        </div>
        <div className="rounded-md bg-navy-deep px-4 py-3.5 shadow-inner">
          <code className="font-mono text-sm break-all text-sky-100">{info.masked}</code>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <dt className="text-slate-400">발급일</dt>
          <dd className="text-right text-slate-600">{formatDate(info.issuedAt)}</dd>
          <dt className="text-slate-400">마지막 사용</dt>
          <dd className="text-right text-slate-600">{info.lastUsedAt ? formatDate(info.lastUsedAt) : '사용 기록 없음'}</dd>
          {info.expiresAt && (
            <>
              <dt className="text-slate-400">만료일</dt>
              <dd className="text-right text-slate-600">{formatDate(info.expiresAt)}</dd>
            </>
          )}
        </dl>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="mt-6 rounded-md border border-slate-200 bg-white/60 p-4"
      >
        <p className="text-sm font-semibold text-slate-800">키를 잃어버렸나요?</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          보안을 위해 키 원문은 발급할 때 한 번만 보여드려요. 재발급하면 새 키가 나오고 <b>기존 키는 바로 사용할 수 없게</b> 돼요.
        </p>
        <AnimatePresence mode="wait" initial={false}>
          {confirming ? (
            <motion.div key="confirm" className="mt-3 flex gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="h-10 flex-1 rounded-md border border-slate-200 bg-white text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                취소
              </button>
              <PrimaryButton type="button" loading={issuing} onClick={onReissue} className="h-10! flex-1 text-sm">
                재발급하기
              </PrimaryButton>
            </motion.div>
          ) : (
            <motion.div key="ask" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="mt-3 h-10 w-full rounded-md border border-navy/20 bg-white text-sm font-semibold text-navy transition hover:border-navy/40 hover:bg-sky-soft/50"
              >
                재발급
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        {error && <p className="mt-2 text-sm text-rose-500">{error}</p>}
      </motion.div>

      <Snippets apiKey={KEY_PLACEHOLDER} display={KEY_PLACEHOLDER} clip={clip} />
      <ResetButton onReset={onReset} />
    </div>
  )
}

function Snippets({ apiKey, display, clip }: { apiKey: string; display: string; clip: ReturnType<typeof useCopy> }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Claude Code')
  const snippets: Record<(typeof TABS)[number], string> = {
    'Claude Code': `claude mcp add --transport http selim ${MCP_URL} \\\n  --header "Authorization: Bearer ${apiKey}"`,
    'Claude Desktop / Cursor': JSON.stringify({ mcpServers: { selim: { url: MCP_URL, headers: { Authorization: `Bearer ${apiKey}` } } } }, null, 2),
  }

  return (
    <motion.div className="mt-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">연결 설정</span>
        <Segmented size="sm" options={TAB_OPTIONS} value={tab} onChange={setTab} />
      </div>
      <div className="relative rounded-md bg-navy-deep p-4 pr-12">
        <pre className="font-mono text-xs leading-relaxed break-all whitespace-pre-wrap text-sky-100">{snippets[tab].replaceAll(apiKey, display)}</pre>
        <div className="absolute top-2 right-2">
          <CopyButton id="snippet" text={snippets[tab]} {...clip} />
        </div>
      </div>
      {apiKey === KEY_PLACEHOLDER && <p className="mt-2 text-xs text-slate-400">{KEY_PLACEHOLDER} 자리에 발급받은 키를 넣어 주세요.</p>}
    </motion.div>
  )
}

function HowTo() {
  return (
    <ol className="mt-6 space-y-3">
      {STEPS.map((s, i) => (
        <motion.li key={s.title} className="flex gap-3" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.1 }}>
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-soft text-xs font-bold text-navy ring-1 ring-sky/40">
            {i + 1}
          </span>
          <div>
            <div className="text-sm font-semibold text-slate-800">{s.title}</div>
            <div className="text-xs leading-relaxed text-slate-500">{s.desc}</div>
          </div>
        </motion.li>
      ))}
    </ol>
  )
}
