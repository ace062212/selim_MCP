import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Segmented } from '../components/ui'
import { EMAIL_RE, inputClass } from './format'
import type { Settings } from './mockData'
import { Button, PageHeader, Panel, PanelTitle, Toggle } from './ui'

type Props = { settings: Settings; onSave: (s: Settings) => void }

export default function SettingsPage({ settings, onSave }: Props) {
  const [draft, setDraft] = useState(settings)
  const dirty = JSON.stringify(draft) !== JSON.stringify(settings)
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setDraft((d) => ({ ...d, [key]: value }))

  return (
    <>
      <PageHeader title="설정" desc="키 발급 정책과 사용 제한을 관리해요." />

      <div className="space-y-4 pb-24">
        <Panel className="p-6">
          <PanelTitle title="접근 정책" />
          <div className="divide-y divide-slate-100">
          <Row label="허용 이메일 도메인" desc="이 도메인의 이메일만 인증번호를 받을 수 있어요.">
            <ChipInput
              values={draft.domains}
              onChange={(v) => set('domains', v)}
              placeholder="예: selim.kr"
              validate={(v) => (/^[a-z0-9.-]+\.[a-z]{2,}$/.test(v) ? '' : '도메인 형식이 아니에요.')}
            />
          </Row>
          <Row label="사용자 자체 발급" desc="끄면 관리자만 키를 발급할 수 있어요.">
            <Toggle checked={draft.selfIssue} onChange={(v) => set('selfIssue', v)} label="사용자 자체 발급" />
          </Row>
          <Row label="키 유효 기간" desc="기간이 지나면 키가 자동으로 만료돼요.">
            <Segmented
              className="w-full sm:w-80"
              options={[
                { value: 'none', label: '무기한' },
                { value: '90', label: '90일' },
                { value: '180', label: '180일' },
                { value: '365', label: '1년' },
              ]}
              value={draft.keyTtl}
              onChange={(v) => set('keyTtl', v)}
            />
          </Row>
          </div>
        </Panel>

        <Panel delay={0.05} className="p-6">
          <PanelTitle title="사용 제한" />
          <div className="divide-y divide-slate-100">
          <Row label="사용자별 요청 제한" desc="한도를 넘으면 429 오류를 돌려줘요.">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={draft.rateLimit}
                onChange={(e) => set('rateLimit', Math.max(1, Number(e.target.value) || 1))}
                className={`${inputClass} w-24 text-right tabular-nums`}
              />
              <span className="text-sm whitespace-nowrap text-slate-500">회 / 분</span>
            </div>
          </Row>
          <Row label="인증번호 유효 시간" desc="메일로 보낸 인증번호가 유효한 시간이에요.">
            <Segmented
              className="w-full sm:w-60"
              options={[
                { value: '3', label: '3분' },
                { value: '5', label: '5분' },
                { value: '10', label: '10분' },
              ]}
              value={draft.otpTtl}
              onChange={(v) => set('otpTtl', v)}
            />
          </Row>
          </div>
        </Panel>

        <Panel delay={0.1} className="p-6">
          <PanelTitle title="관리자" desc="이 페이지에 접근할 수 있는 계정이에요." />
          <ChipInput
            values={draft.admins}
            onChange={(v) => set('admins', v)}
            placeholder="관리자 이메일 추가"
            validate={(v) => (EMAIL_RE.test(v) ? '' : '올바른 이메일 주소를 입력해 주세요.')}
            minCount={1}
          />
        </Panel>
      </div>

      {/* 변경사항이 있을 때만 떠오르는 저장 바 */}
      <AnimatePresence>
        {dirty && (
          <motion.div
            className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4 lg:pl-64"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex w-full max-w-lg items-center gap-3 rounded-lg border border-white/10 bg-navy-deep/95 py-2.5 pr-2.5 pl-5 text-sm text-white shadow-2xl shadow-navy/30 backdrop-blur-xl">
              <span className="flex-1">저장하지 않은 변경사항이 있어요.</span>
              <button type="button" onClick={() => setDraft(settings)} className="h-9 rounded-md px-3 text-sky-200 transition hover:bg-white/10">
                되돌리기
              </button>
              <button
                type="button"
                onClick={() => onSave(draft)}
                className="h-9 rounded-md bg-white px-4 font-semibold text-navy-deep transition hover:bg-sky-soft active:scale-[0.98]"
              >
                저장
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function Row({ label, desc, children }: { label: string; desc: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 py-5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="mt-0.5 text-xs text-slate-500">{desc}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function ChipInput({
  values,
  onChange,
  placeholder,
  validate,
  minCount = 0,
}: {
  values: string[]
  onChange: (v: string[]) => void
  placeholder: string
  validate: (v: string) => string
  minCount?: number
}) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  const add = (e: FormEvent) => {
    e.preventDefault()
    const v = text.trim().toLowerCase()
    if (!v) return
    const err = validate(v) || (values.includes(v) ? '이미 추가돼 있어요.' : '')
    if (err) return setError(err)
    onChange([...values, v])
    setText('')
  }

  return (
    <div className="sm:w-80">
      <div className="flex flex-wrap gap-1.5">
        <AnimatePresence initial={false}>
          {values.map((v) => (
            <motion.span
              key={v}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="inline-flex items-center gap-1 rounded bg-sky-soft py-1 pr-1 pl-2.5 text-sm text-navy ring-1 ring-navy/10 ring-inset"
            >
              {v}
              <button
                type="button"
                disabled={values.length <= minCount}
                onClick={() => onChange(values.filter((x) => x !== v))}
                aria-label={`${v} 삭제`}
                className="grid h-5 w-5 place-items-center rounded text-navy/50 transition hover:bg-navy/10 hover:text-navy disabled:invisible"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
      <form onSubmit={add} className="mt-2.5 flex gap-2">
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setError('')
          }}
          placeholder={placeholder}
          className={`${inputClass} w-full ${error ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-100' : ''}`}
        />
        <Button type="submit" variant="secondary" className="shrink-0">
          추가
        </Button>
      </form>
      {error && <p className="mt-1.5 text-xs text-rose-500">{error}</p>}
    </div>
  )
}
