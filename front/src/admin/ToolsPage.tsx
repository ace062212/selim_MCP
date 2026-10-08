import { Check, Copy, PenLine } from 'lucide-react'
import { useState } from 'react'
import { Toggle } from '../components/ui'
import { api, errorMessage, type AdminTool } from '../lib/api'
import { MCP_URL } from '../lib/config'
import { fmtNum } from './format'
import type { Notify } from './notify'
import { Badge, Button, IconButton, LoadError, Modal, PageHeader, Panel } from './ui'
import { useCopy } from './useCopy'
import { useLoad } from './useLoad'

export default function ToolsPage({ notify }: { notify: Notify }) {
  const { data: tools, error, setData } = useLoad(api.admin.tools)
  const { data: health, error: healthError } = useLoad(api.health)
  const [editing, setEditing] = useState<AdminTool | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const { copied, copy } = useCopy()

  if (error) return <LoadError message={error} />
  const list = tools ?? []
  const enabled = list.filter((t) => t.enabled).length
  const totalCalls = list.reduce((s, t) => s + t.calls, 0)

  const toggle = async (t: AdminTool) => {
    const next = !t.enabled
    setData(list.map((x) => (x.name === t.name ? { ...x, enabled: next } : x)))
    try {
      await api.admin.updateTool(t.name, { enabled: next })
      notify(`${t.name} 도구를 ${next ? '활성화' : '비활성화'}했어요`)
    } catch (err) {
      setData(list)
      notify(errorMessage(err), 'error')
    }
  }

  const saveDescription = async (t: AdminTool, override: string | null) => {
    await api.admin.updateTool(t.name, { descriptionOverride: override })
    setData(list.map((x) => (x.name === t.name ? { ...x, descriptionOverride: override, description: override ?? x.defaultDescription } : x)))
    notify(`${t.name} 도구 설명을 ${override ? '수정' : '기본값으로 되돌렸'}어요`)
  }

  return (
    <>
      <PageHeader title="MCP 도구" desc="사용자에게 공개할 도구를 켜고 끌 수 있어요. 새로 배포된 도구는 꺼진 상태로 등록되니 확인 후 켜 주세요." />

      <Panel className="mb-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-x-10 gap-y-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {healthError ? (
                <>
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                  <span className="text-sm font-semibold text-rose-700">서버 응답 없음</span>
                </>
              ) : (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  </span>
                  <span className="text-sm font-semibold text-emerald-700">{health ? '정상 운영 중' : '확인 중…'}</span>
                </>
              )}
            </div>
            <div className="mt-2 flex items-center gap-1">
              <code className="truncate font-mono text-sm text-navy-deep">{MCP_URL}</code>
              <button
                type="button"
                onClick={() => copy(MCP_URL)}
                aria-label="주소 복사"
                className="grid h-7 w-7 shrink-0 place-items-center rounded text-slate-400 transition hover:bg-sky-soft hover:text-navy"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
          <ServerStat label="공개 도구" value={`${enabled} / ${list.length}`} />
          <ServerStat label="호출(7일)" value={fmtNum(totalCalls)} />
          <ServerStat label="서버 버전" value={health ? `v${health.version}` : '-'} />
        </div>
      </Panel>

      {tools === null && <p className="py-16 text-center text-sm text-slate-400">불러오는 중…</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {list.map((t, i) => (
          <Panel key={t.name} delay={0.05 + i * 0.04} className={`flex flex-col p-5 transition-opacity ${t.enabled ? '' : 'opacity-60'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[15px] font-semibold text-navy-deep">{t.name}</span>
                  {t.category && <Badge tone="sky">{t.category}</Badge>}
                  {t.descriptionOverride && <Badge tone="slate">설명 수정됨</Badge>}
                </div>
                <p className="mt-1.5 text-sm text-slate-500">{t.description}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <IconButton
                  label="설명 수정"
                  onClick={() => {
                    setEditing(t)
                    setEditOpen(true)
                  }}
                >
                  <PenLine className="h-4 w-4" />
                </IconButton>
                <Toggle checked={t.enabled} onChange={() => toggle(t)} label={`${t.name} 사용`} />
              </div>
            </div>
            <div className="mt-auto pt-5">
              <dl className="grid grid-cols-3 gap-3 border-t border-slate-100 pt-4 text-sm">
                <Metric label="호출(7일)" value={t.calls ? fmtNum(t.calls) : '-'} />
                <Metric label="평균 응답" value={t.latency ? `${t.latency}ms` : '-'} warn={t.latency > 800} />
                <Metric label="오류율" value={t.calls ? `${t.errorRate}%` : '-'} warn={t.errorRate >= 2} />
              </dl>
            </div>
          </Panel>
        ))}
      </div>

      {editing && (
        <DescriptionModal key={editing.name} open={editOpen} tool={editing} onSave={saveDescription} onClose={() => setEditOpen(false)} />
      )}
    </>
  )
}

function DescriptionModal({
  open,
  tool,
  onSave,
  onClose,
}: {
  open: boolean
  tool: AdminTool
  onSave: (t: AdminTool, override: string | null) => Promise<void>
  onClose: () => void
}) {
  const [text, setText] = useState(tool.description)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async (override: string | null) => {
    setSaving(true)
    try {
      await onSave(tool, override)
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }
  const trimmed = text.trim()

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${tool.name} 설명 수정`}
      desc="Claude는 이 설명을 읽고 언제 이 도구를 쓸지 정해요. 언제 쓰는 도구인지 구체적으로 적을수록 정확하게 골라요."
    >
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setError('')
        }}
        rows={5}
        className="w-full resize-y rounded-md border border-slate-200 bg-white/80 px-3 py-2.5 text-sm leading-relaxed outline-none transition focus:border-sky focus:ring-4 focus:ring-sky/20"
      />
      <p className="mt-1.5 text-xs text-slate-400">코드 기본값: {tool.defaultDescription}</p>
      {error && <p className="mt-2 text-sm text-rose-500">{error}</p>}
      <div className="mt-5 flex flex-wrap justify-between gap-2">
        <Button variant="secondary" disabled={saving || !tool.descriptionOverride} onClick={() => save(null)}>
          기본값으로
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button disabled={saving || !trimmed} onClick={() => save(trimmed === tool.defaultDescription ? null : trimmed)}>
            저장
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function ServerStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-navy-deep tabular-nums">{value}</p>
    </div>
  )
}

function Metric({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className={`mt-0.5 font-semibold tabular-nums ${warn ? 'text-amber-600' : 'text-slate-700'}`}>{value}</dd>
    </div>
  )
}
