import { motion } from 'framer-motion'
import { RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api, errorMessage, type UserTool } from '../lib/api'
import { StepHeader, Toggle } from './ui'

type Props = { email: string; onReset: () => void }

// 사용자 개인 도구 켜기/끄기. 관리자가 끈 도구는 바꿀 수 없음 (doc/04-tool-policy.md)
export default function ToolsStep({ email, onReset }: Props) {
  const [tools, setTools] = useState<UserTool[] | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    api.myTools().then(setTools, (err) => setError(errorMessage(err)))
  }, [])

  const toggle = async (tool: UserTool, enabled: boolean) => {
    const before = tools
    // 먼저 화면에 반영하고, 실패하면 되돌림
    setTools((list) => list?.map((t) => (t.name === tool.name ? { ...t, userEnabled: enabled, enabled: t.adminEnabled && enabled } : t)) ?? null)
    setSaving(tool.name)
    setError('')
    try {
      const saved = await api.setMyTool(tool.name, enabled)
      setTools((list) => list?.map((t) => (t.name === saved.name ? saved : t)) ?? null)
    } catch (err) {
      setTools(before)
      setError(errorMessage(err))
    } finally {
      setSaving(null)
    }
  }

  const usable = tools?.filter((t) => t.enabled).length ?? 0

  return (
    <div>
      <StepHeader
        title="내 도구 설정"
        desc={
          <>
            <span className="font-semibold text-navy">{email}</span> 님이 Claude에서 쓸 도구를 고르세요.
            <br />
            바꾼 설정은 Claude에 다시 연결하면(새 대화, 재시작) 적용돼요.
          </>
        }
      />

      {tools === null && !error && (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[74px] animate-pulse rounded-md bg-slate-100/80" />
          ))}
        </div>
      )}

      {tools && (
        <>
          <p className="mb-2.5 text-xs text-slate-500">
            {tools.length}개 중 <b className="text-navy">{usable}개</b> 사용 중
          </p>
          <ul className="space-y-2.5">
            {tools.map((t, i) => (
              <motion.li
                key={t.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`flex items-start gap-4 rounded-md border bg-white/70 px-4 py-3.5 transition ${
                  t.adminEnabled ? 'border-slate-200' : 'border-dashed border-slate-200 opacity-70'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-sm font-semibold text-navy-deep">{t.name}</span>
                    {t.category && <span className="rounded bg-sky-soft px-1.5 py-px text-[11px] font-medium text-navy">{t.category}</span>}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">{t.description}</p>
                  {!t.adminEnabled && <p className="mt-1 text-xs font-medium text-amber-600">관리자가 비활성화한 도구예요.</p>}
                </div>
                <Toggle
                  checked={t.enabled}
                  disabled={!t.adminEnabled || saving === t.name}
                  onChange={(v) => toggle(t, v)}
                  label={`${t.name} 사용`}
                />
              </motion.li>
            ))}
          </ul>
        </>
      )}

      {error && <p className="mt-3 text-center text-sm text-rose-500">{error}</p>}

      <button
        type="button"
        onClick={onReset}
        className="mt-7 inline-flex w-full items-center justify-center gap-1.5 text-sm text-slate-500 transition hover:text-navy"
      >
        <RotateCcw className="h-3.5 w-3.5" /> 처음으로
      </button>
    </div>
  )
}
