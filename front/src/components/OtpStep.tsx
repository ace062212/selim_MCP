import { motion, useAnimationControls } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react'
import { api, errorMessage } from '../lib/api'
import type { Mode } from './EmailStep'
import { PrimaryButton, StepHeader } from './ui'

const LENGTH = 6
// 서버에서 같은 이메일은 30초에 한 번만 다시 보낼 수 있음
const RESEND_AFTER = 30

type Props = {
  email: string
  mode: Mode
  ttlMinutes: number
  devMode: boolean
  onBack: () => void
  // 인증 통과 후 다음 단계 준비 (실패하면 이 화면에 오류 표시)
  onVerified: () => Promise<void>
}

export default function OtpStep({ email, mode, ttlMinutes, devMode, onBack, onVerified }: Props) {
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(''))
  const [loading, setLoading] = useState(false)
  const [remaining, setRemaining] = useState(ttlMinutes * 60)
  // 발송 직후의 남은 시간. 여기서 30초가 줄면 재전송 가능
  const [sentWith, setSentWith] = useState(ttlMinutes * 60)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const shake = useAnimationControls()

  useEffect(() => {
    inputs.current[0]?.focus()
  }, [])

  useEffect(() => {
    if (remaining <= 0) return
    const t = setTimeout(() => setRemaining((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [remaining])

  const code = digits.join('')

  const fail = (message: string) => {
    setError(message)
    shake.start({ x: [0, -10, 10, -6, 6, 0], transition: { duration: 0.4 } })
  }

  const verify = async (value: string) => {
    if (loading) return
    if (value.length !== LENGTH) return fail('인증번호 6자리를 모두 입력해 주세요.')
    setError('')
    setLoading(true)
    try {
      await api.verifyOtp(email, mode, value)
      await onVerified()
    } catch (err) {
      setLoading(false)
      setDigits(Array(LENGTH).fill(''))
      fail(errorMessage(err))
      setTimeout(() => inputs.current[0]?.focus())
    }
  }

  const resend = async () => {
    setResending(true)
    try {
      const r = await api.requestOtp(email, mode)
      setRemaining(r.ttlMinutes * 60)
      setSentWith(r.ttlMinutes * 60)
      setDigits(Array(LENGTH).fill(''))
      setError('')
      inputs.current[0]?.focus()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setResending(false)
    }
  }
  const canResend = sentWith - remaining >= RESEND_AFTER

  const setAt = (i: number, v: string) => {
    const next = [...digits]
    next[i] = v
    setDigits(next)
    if (error) setError('')
    return next
  }

  const handleChange = (i: number, raw: string) => {
    const v = raw.replace(/\D/g, '').slice(-1)
    if (!v) return
    const next = setAt(i, v)
    if (i < LENGTH - 1) inputs.current[i + 1]?.focus()
    else if (next.every(Boolean)) verify(next.join(''))
  }

  const handleKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      if (digits[i]) setAt(i, '')
      else if (i > 0) {
        setAt(i - 1, '')
        inputs.current[i - 1]?.focus()
      }
    } else if (e.key === 'ArrowLeft' && i > 0) inputs.current[i - 1]?.focus()
    else if (e.key === 'ArrowRight' && i < LENGTH - 1) inputs.current[i + 1]?.focus()
    else if (e.key === 'Enter') verify(code)
  }

  const handlePaste = (e: ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LENGTH)
    if (!pasted) return
    e.preventDefault()
    const next = Array.from({ length: LENGTH }, (_, i) => pasted[i] ?? '')
    setDigits(next)
    inputs.current[Math.min(pasted.length, LENGTH - 1)]?.focus()
    if (pasted.length === LENGTH) verify(pasted)
  }

  const mm = String(Math.floor(remaining / 60))
  const ss = String(remaining % 60).padStart(2, '0')

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-2 -ml-1 inline-flex items-center gap-1 px-1 py-1 text-sm text-slate-500 transition hover:text-navy"
      >
        <ArrowLeft className="h-4 w-4" /> 이메일 변경
      </button>
      <StepHeader
        title="인증번호 입력"
        desc={
          <>
            <span className="font-semibold text-navy">{email}</span> 으로
            <br />
            보낸 6자리 인증번호를 입력해 주세요.
          </>
        }
      />

      <motion.div animate={shake} className="flex justify-between gap-2" onPaste={handlePaste}>
        {digits.map((d, i) => (
          <motion.input
            key={i}
            ref={(el) => {
              inputs.current[i] = el
            }}
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            value={d}
            disabled={loading}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onFocus={(e) => e.target.select()}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0, scale: d ? [1, 1.08, 1] : 1 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            className={`h-14 w-full min-w-0 rounded-md border bg-white/80 text-center text-2xl font-bold text-navy-deep outline-none transition focus:ring-4 ${
              error ? 'border-rose-400 focus:ring-rose-100' : d ? 'border-sky' : 'border-slate-200'
            } focus:border-sky focus:ring-sky/20`}
          />
        ))}
      </motion.div>

      <div className="mt-3 flex min-h-5 items-start justify-between gap-3 text-sm">
        <span className="text-rose-500">{error}</span>
        <span className="flex shrink-0 items-center gap-3">
          <span className={`tabular-nums ${remaining > 0 ? 'text-slate-500' : 'text-rose-500'}`}>
            {remaining > 0 ? `${mm}:${ss}` : '만료됨'}
          </span>
          <button
            type="button"
            onClick={resend}
            disabled={!canResend || resending || loading}
            className="font-medium text-navy underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline"
          >
            재전송
          </button>
        </span>
      </div>

      <PrimaryButton type="button" loading={loading} onClick={() => verify(code)} className="mt-4">
        인증하기
      </PrimaryButton>
      {devMode && <p className="mt-4 text-center text-xs text-slate-400">개발 모드: 아무 숫자 6자리나 입력하면 통과돼요.</p>}
    </div>
  )
}
