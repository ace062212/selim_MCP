import { AnimatePresence, motion } from 'framer-motion'
import { Check, Copy, Pause, Play, Plus, RefreshCw, Search, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Segmented } from '../components/ui'
import { api, errorMessage, type AdminKey, type IssuedKey } from '../lib/api'
import { EMAIL_RE, fmtDate, fmtNum, inputClass, timeAgo } from './format'
import type { Notify } from './notify'
import { Badge, Button, ConfirmModal, IconButton, LoadError, Modal, PageHeader, Panel } from './ui'
import { useCopy } from './useCopy'
import { useLoad } from './useLoad'

type Filter = 'all' | 'active' | 'suspended'
type Confirm = { type: 'revoke' | 'reissue'; key: AdminKey; open: boolean } | null

const who = (k: AdminKey) => k.name || k.email

export default function KeysPage({ notify }: { notify: Notify }) {
  const { data: keys, error, reload } = useLoad(api.admin.keys)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [confirm, setConfirm] = useState<Confirm>(null)
  const [issueOpen, setIssueOpen] = useState(false)
  // 열 때마다 새 입력 상태로 시작하도록 key를 바꿈
  const [issueRun, setIssueRun] = useState(0)
  // 재발급 결과(원문)는 한 번만 보여줌
  const [reissued, setReissued] = useState<{ key: IssuedKey; owner: string } | null>(null)
  const closeConfirm = () => setConfirm((c) => c && { ...c, open: false })

  if (error) return <LoadError message={error} />
  const list = keys ?? []

  const run = async (action: () => Promise<unknown>, done: string, tone: 'ok' | 'error' = 'ok') => {
    try {
      await action()
      notify(done, tone)
    } catch (err) {
      notify(errorMessage(err), 'error')
    }
    reload()
  }

  const count = (f: Filter) => (f === 'all' ? list.length : list.filter((k) => k.status === f).length)
  const q = query.trim().toLowerCase()
  const rows = list.filter(
    (k) =>
      (filter === 'all' || k.status === filter) &&
      (!q || k.email.includes(q) || (k.name ?? '').includes(q) || (k.dept ?? '').toLowerCase().includes(q)),
  )

  return (
    <>
      <PageHeader
        title="API 키"
        desc="발급된 키를 조회하고 정지·재발급·폐기할 수 있어요."
        action={
          <Button
            onClick={() => {
              setIssueRun((n) => n + 1)
              setIssueOpen(true)
            }}
          >
            <Plus className="h-4 w-4" />키 직접 발급
          </Button>
        }
      />

      <Panel>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="relative sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="이름, 이메일, 부서 검색" className={`${inputClass} w-full pl-9`} />
          </div>
          <Segmented
            className="sm:w-72"
            options={[
              { value: 'all', label: `전체 ${count('all')}` },
              { value: 'active', label: `활성 ${count('active')}` },
              { value: 'suspended', label: `정지 ${count('suspended')}` },
            ]}
            value={filter}
            onChange={setFilter}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-slate-500">
                <th className="px-5 py-3 font-medium">사용자</th>
                <th className="px-3 py-3 font-medium">API 키</th>
                <th className="px-3 py-3 font-medium">발급일</th>
                <th className="px-3 py-3 font-medium">최근 사용</th>
                <th className="px-3 py-3 text-right font-medium">요청(30일)</th>
                <th className="px-3 py-3 font-medium">상태</th>
                <th className="px-5 py-3 text-right font-medium">관리</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {rows.map((k) => (
                  <motion.tr
                    key={k.id}
                    layout="position"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="border-t border-slate-100 transition-colors hover:bg-sky-soft/40"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sky-soft text-xs font-semibold text-navy">
                          {k.name ? k.name.slice(-2) : k.email[0].toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800">
                            {k.name || <span className="text-slate-400">이름 미등록</span>}
                            {k.dept && <span className="ml-2 text-xs font-normal text-slate-400">{k.dept}</span>}
                          </p>
                          <p className="truncate text-xs text-slate-500">{k.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 font-mono text-xs text-slate-600">{k.masked}</td>
                    <td className="px-3 py-3.5 text-slate-600 tabular-nums">
                      {fmtDate(k.issuedAt)}
                      {k.issuedBy === 'admin' && <span className="ml-1.5 text-xs text-slate-400">관리자</span>}
                    </td>
                    <td className={`px-3 py-3.5 ${k.lastUsedAt ? 'text-slate-600' : 'text-slate-400'}`}>{timeAgo(k.lastUsedAt)}</td>
                    <td className="px-3 py-3.5 text-right text-slate-700 tabular-nums">{fmtNum(k.requests)}</td>
                    <td className="px-3 py-3.5">
                      {k.status === 'active' ? (
                        <Badge tone="green" dot>
                          활성
                        </Badge>
                      ) : (
                        <Badge tone="amber" dot>
                          정지
                        </Badge>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-0.5">
                        <IconButton
                          label={k.status === 'active' ? '정지' : '다시 활성화'}
                          onClick={() =>
                            k.status === 'active'
                              ? run(() => api.admin.setKeyStatus(k.id, 'suspended'), `${who(k)}님의 키를 정지했어요`)
                              : run(() => api.admin.setKeyStatus(k.id, 'active'), `${who(k)}님의 키를 다시 활성화했어요`)
                          }
                        >
                          {k.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </IconButton>
                        <IconButton label="재발급" onClick={() => setConfirm({ type: 'reissue', key: k, open: true })}>
                          <RefreshCw className="h-4 w-4" />
                        </IconButton>
                        <IconButton label="폐기" tone="danger" onClick={() => setConfirm({ type: 'revoke', key: k, open: true })}>
                          <Trash2 className="h-4 w-4" />
                        </IconButton>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {keys === null && <p className="border-t border-slate-100 py-16 text-center text-sm text-slate-400">불러오는 중…</p>}
          {keys !== null && rows.length === 0 && (
            <p className="border-t border-slate-100 py-16 text-center text-sm text-slate-400">
              {list.length ? '조건에 맞는 키가 없어요.' : '아직 발급된 키가 없어요.'}
            </p>
          )}
        </div>
      </Panel>

      <ConfirmModal
        open={!!confirm?.open && confirm.type === 'reissue'}
        title="키를 재발급할까요?"
        desc={
          <>
            <b className="text-slate-700">{confirm && who(confirm.key)}</b>님의 기존 키는 즉시 사용할 수 없게 돼요. 새 키는 이번에 한 번만 보여드리니
            사용자에게 안전하게 전달해 주세요.
          </>
        }
        confirmLabel="재발급"
        onConfirm={() => {
          if (!confirm) return
          const k = confirm.key
          void run(async () => setReissued({ key: await api.admin.reissueKey(k.id), owner: who(k) }), `${who(k)}님의 키를 재발급했어요`)
        }}
        onClose={closeConfirm}
      />
      <ConfirmModal
        open={!!confirm?.open && confirm.type === 'revoke'}
        danger
        title="키를 폐기할까요?"
        desc={
          <>
            <b className="text-slate-700">{confirm && who(confirm.key)}</b>님의 키가 폐기되고 MCP에 접속할 수 없게 돼요. 이 작업은 되돌릴 수 없어요.
          </>
        }
        confirmLabel="폐기"
        onConfirm={() => {
          if (!confirm) return
          const k = confirm.key
          void run(() => api.admin.revokeKey(k.id), `${who(k)}님의 키를 폐기했어요`)
        }}
        onClose={closeConfirm}
      />
      <IssueModal
        key={issueRun}
        open={issueOpen}
        onIssue={async (email) => {
          const issued = await api.admin.issueKey(email)
          notify(`${email}님에게 키를 발급했어요`)
          reload()
          return issued
        }}
        onClose={() => setIssueOpen(false)}
      />
      <KeyResultModal
        open={!!reissued}
        title="새 키를 발급했어요"
        desc={`${reissued?.owner ?? ''}님에게 안전한 방법으로 전달해 주세요. 이 창을 닫으면 다시 볼 수 없어요.`}
        apiKey={reissued?.key.key ?? ''}
        onClose={() => setReissued(null)}
      />
    </>
  )
}

function KeyResultModal({ open, title, desc, apiKey, onClose }: { open: boolean; title: string; desc: string; apiKey: string; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title={title} desc={desc}>
      <KeyBox apiKey={apiKey} />
      <div className="mt-6 flex justify-end">
        <Button onClick={onClose}>확인</Button>
      </div>
    </Modal>
  )
}

function KeyBox({ apiKey }: { apiKey: string }) {
  const { copied, copy } = useCopy()
  return (
    <div className="flex items-center gap-2 rounded-md bg-navy-deep p-3 pl-4">
      <code className="flex-1 font-mono text-xs break-all text-sky-100">{apiKey}</code>
      <button
        type="button"
        onClick={() => copy(apiKey)}
        className="grid h-8 w-8 shrink-0 place-items-center rounded text-sky-200 transition hover:bg-white/10"
        aria-label="복사"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  )
}

function IssueModal({ open, onIssue, onClose }: { open: boolean; onIssue: (email: string) => Promise<IssuedKey>; onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [issued, setIssued] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const value = email.trim().toLowerCase()
    if (!EMAIL_RE.test(value)) return setError('올바른 이메일 주소를 입력해 주세요.')
    setLoading(true)
    try {
      setIssued((await onIssue(value)).key)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  if (issued)
    return (
      <Modal open={open} onClose={onClose} title="키를 발급했어요" desc="사용자에게 안전한 방법으로 전달해 주세요. 이 창을 닫으면 다시 볼 수 없어요.">
        <KeyBox apiKey={issued} />
        <div className="mt-6 flex justify-end">
          <Button onClick={onClose}>확인</Button>
        </div>
      </Modal>
    )

  return (
    <Modal open={open} onClose={onClose} title="키 직접 발급" desc="이메일 인증 없이 관리자가 바로 키를 발급해요. 이미 키가 있으면 새 키로 바뀌어요.">
      <form onSubmit={submit} noValidate>
        <input
          autoFocus
          type="email"
          placeholder="name@selim.kr"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            setError('')
          }}
          className={`${inputClass} h-11 w-full ${error ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-100' : ''}`}
        />
        <p className="mt-2 min-h-5 text-sm text-rose-500">{error}</p>
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" disabled={loading}>
            발급
          </Button>
        </div>
      </form>
    </Modal>
  )
}
