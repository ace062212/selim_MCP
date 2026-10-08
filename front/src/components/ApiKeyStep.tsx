import { AnimatePresence, motion } from 'framer-motion'
import { Check, Copy, Eye, EyeOff, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import type { KeyRecord } from '../lib/keyStore'
import type { Mode } from './EmailStep'
import { PrimaryButton, Segmented } from './ui'
import { MCP_URL } from '../lib/config'

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

const STEPS = [
  { title: 'API 키 보관', desc: '키는 외부에 공유하지 마세요. 잊어버리면 \'내 키 조회\'에서 이메일 인증 후 다시 확인할 수 있어요.' },
  { title: 'MCP 클라이언트에 등록', desc: '사용하는 도구에 맞는 설정을 복사해서 붙여 넣으세요.' },
  { title: '바로 사용', desc: 'AI 도구에서 사내 시스템(문서, 데이터 등)을 바로 불러와 쓸 수 있어요.' },
]

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })

type Props = { email: string; mode: Mode; record: KeyRecord | null; onIssue: () => void; onReset: () => void }

export default function ApiKeyStep({ email, mode, record, onIssue, onReset }: Props) {
  if (!record) return <NoKey email={email} onIssue={onIssue} onReset={onReset} />
  return <KeyView email={email} mode={mode} record={record} onReset={onReset} />
}

// 조회했는데 발급된 키가 없을 때
function NoKey({ email, onIssue, onReset }: Pick<Props, 'email' | 'onIssue' | 'onReset'>) {
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
      <PrimaryButton type="button" onClick={onIssue}>
        지금 발급받기
      </PrimaryButton>
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

function KeyView({ email, mode, record, onReset }: Omit<Props, 'onIssue' | 'record'> & { record: KeyRecord }) {
  const apiKey = record.key
  const [show, setShow] = useState(false)
  const [tab, setTab] = useState<(typeof TABS)[number]>('Claude Code')
  const clip = useCopy()

  const masked = apiKey.slice(0, 14) + '•'.repeat(10) + apiKey.slice(-4)
  const snippets: Record<(typeof TABS)[number], string> = {
    'Claude Code': `claude mcp add --transport http selim ${MCP_URL} \\\n  --header "Authorization: Bearer ${apiKey}"`,
    'Claude Desktop / Cursor': JSON.stringify(
      { mcpServers: { selim: { url: MCP_URL, headers: { Authorization: `Bearer ${apiKey}` } } } },
      null,
      2,
    ),
  }

  return (
    <div>
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-navy-deep">
          {mode === 'issue' ? '인증 완료!' : '내 API 키'}
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          <span className="font-semibold text-navy">{email}</span>{' '}
          {mode === 'issue' ? '님의 MCP API 키가 발급됐어요.' : `님의 키예요 · ${formatDate(record.issuedAt)} 발급`}
        </p>
      </div>

      {/* API 키 */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="mb-2 text-sm font-medium text-slate-700">API 키</div>
        <div className="flex items-center gap-1 rounded-md bg-navy-deep py-2 pr-2 pl-4 shadow-inner">
          <code className="min-w-0 flex-1 font-mono text-sm break-all text-sky-100">{show ? apiKey : masked}</code>
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? '숨기기' : '보기'}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
          <CopyButton id="key" text={apiKey} {...clip} />
        </div>
      </motion.div>

      {/* 연결 설정 */}
      <motion.div className="mt-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">연결 설정</span>
          <Segmented size="sm" options={TAB_OPTIONS} value={tab} onChange={setTab} />
        </div>
        <div className="relative rounded-md bg-navy-deep p-4 pr-12">
          <pre className="whitespace-pre-wrap break-all font-mono text-xs leading-relaxed text-sky-100">
            {snippets[tab].replaceAll(apiKey, show ? apiKey : masked)}
          </pre>
          <div className="absolute top-2 right-2">
            <CopyButton id="snippet" text={snippets[tab]} {...clip} />
          </div>
        </div>
      </motion.div>

      {/* 사용 방법 */}
      <ol className="mt-6 space-y-3">
        {STEPS.map((s, i) => (
          <motion.li
            key={s.title}
            className="flex gap-3"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + i * 0.1 }}
          >
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

      <ResetButton onReset={onReset} />
    </div>
  )
}
