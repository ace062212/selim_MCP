import { useState, type FormEvent } from 'react'
import { PrimaryButton, Segmented, StepHeader } from './ui'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type Mode = 'issue' | 'lookup'

const MODES: { value: Mode; label: string }[] = [
  { value: 'issue', label: 'API 키 발급' },
  { value: 'lookup', label: '내 키 조회' },
]

const COPY: Record<Mode, { title: string; desc: string; button: string }> = {
  issue: {
    title: '사내 MCP 시작하기',
    desc: 'MCP 접속용 API 키를 바로 발급해 드려요.',
    button: '인증번호 받기',
  },
  lookup: {
    title: '내 API 키 조회',
    desc: '발급받은 API 키를 다시 확인할 수 있어요.',
    button: '인증번호 받고 조회하기',
  },
}

type Props = {
  mode: Mode
  onModeChange: (mode: Mode) => void
  defaultEmail: string
  onSubmit: (email: string) => void
}

export default function EmailStep({ mode, onModeChange, defaultEmail, onSubmit }: Props) {
  const [email, setEmail] = useState(defaultEmail)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!EMAIL_RE.test(email.trim())) {
      setError('올바른 이메일 주소를 입력해 주세요.')
      return
    }
    setError('')
    setLoading(true)
    // TODO: 백엔드 연동 시 인증번호 발송 API 호출
    setTimeout(() => onSubmit(email.trim()), 900)
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Segmented
        className="mb-7"
        options={MODES}
        value={mode}
        disabled={loading}
        onChange={(m) => {
          onModeChange(m)
          setError('')
        }}
      />
      <StepHeader
        title={COPY[mode].title}
        desc={
          <>
            회사 이메일로 본인 인증을 하면
            <br />
            {COPY[mode].desc}
          </>
        }
      />
      <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
        이메일
      </label>
      <input
        id="email"
        type="email"
        autoFocus
        autoComplete="email"
        placeholder="name@selim.kr"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value)
          if (error) setError('')
        }}
        className={`h-12 w-full rounded-md border bg-white/80 px-4 text-base outline-none transition placeholder:text-slate-400 focus:ring-4 ${
          error ? 'border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:border-sky focus:ring-sky/20'
        }`}
      />
      <p className="mt-2 h-5 text-sm text-rose-500">{error}</p>
      <PrimaryButton type="submit" loading={loading} className="mt-2">
        {COPY[mode].button}
      </PrimaryButton>
    </form>
  )
}
