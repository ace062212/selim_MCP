import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import logo from '../assets/selim-logo.png'
import Background from '../components/Background'
import { PrimaryButton } from '../components/ui'
import { api, errorMessage } from '../lib/api'
import { EMAIL_RE } from './format'

const fieldClass =
  'h-12 w-full rounded-md border bg-white/80 px-4 text-base outline-none transition placeholder:text-slate-400 focus:ring-4'

// 관리자 로그인: 관리자로 등록된 이메일 → 인증번호
export default function AdminLogin({ onLogin }: { onLogin: (email: string) => void }) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState<{ devMode: boolean } | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const requestCode = async (e: FormEvent) => {
    e.preventDefault()
    const value = email.trim().toLowerCase()
    if (!EMAIL_RE.test(value)) return setError('올바른 이메일 주소를 입력해 주세요.')
    setLoading(true)
    setError('')
    try {
      setSent(await api.requestOtp(value, 'admin'))
      setEmail(value)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const verify = async (e: FormEvent) => {
    e.preventDefault()
    if (!/^\d{6}$/.test(code)) return setError('인증번호 6자리를 입력해 주세요.')
    setLoading(true)
    setError('')
    try {
      await api.verifyOtp(email, 'admin', code)
      onLogin(email)
    } catch (err) {
      setError(errorMessage(err))
      setCode('')
      setLoading(false)
    }
  }

  const fieldTone = error ? 'border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:border-sky focus:ring-sky/20'

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-10">
      <Background />
      <motion.img
        src={logo}
        alt="세림티에스지"
        className="h-16 w-auto"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.p
        className="mt-4 mb-8 text-xs font-semibold tracking-[0.4em] text-sky"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        MCP ADMIN
      </motion.p>

      <motion.div
        className="w-full max-w-sm overflow-hidden rounded-lg border border-white/60 bg-white/75 p-7 shadow-2xl shadow-navy/10 ring-1 ring-slate-900/5 backdrop-blur-xl sm:p-8"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {!sent ? (
            <motion.form key="email" onSubmit={requestCode} noValidate initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h1 className="text-xl font-bold tracking-tight text-navy-deep">관리자 로그인</h1>
              <p className="mt-1.5 mb-6 text-sm text-slate-500">관리자로 등록된 회사 이메일로 인증해 주세요.</p>
              <input
                type="email"
                autoFocus
                autoComplete="email"
                placeholder="name@selim.kr"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError('')
                }}
                className={`${fieldClass} ${fieldTone}`}
              />
              <p className="mt-2 min-h-5 text-sm text-rose-500">{error}</p>
              <PrimaryButton type="submit" loading={loading} className="mt-2">
                인증번호 받기
              </PrimaryButton>
            </motion.form>
          ) : (
            <motion.form key="code" onSubmit={verify} noValidate initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <button
                type="button"
                onClick={() => {
                  setSent(null)
                  setCode('')
                  setError('')
                }}
                className="mb-2 -ml-1 inline-flex items-center gap-1 px-1 py-1 text-sm text-slate-500 transition hover:text-navy"
              >
                <ArrowLeft className="h-4 w-4" /> 이메일 변경
              </button>
              <h1 className="text-xl font-bold tracking-tight text-navy-deep">인증번호 입력</h1>
              <p className="mt-1.5 mb-6 text-sm text-slate-500">
                <span className="font-semibold text-navy">{email}</span> 으로 보낸 6자리를 입력해 주세요.
              </p>
              <input
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, ''))
                  setError('')
                }}
                className={`${fieldClass} ${fieldTone} text-center font-mono text-2xl tracking-[0.5em]`}
              />
              <p className="mt-2 min-h-5 text-sm text-rose-500">{error}</p>
              <PrimaryButton type="submit" loading={loading} className="mt-2">
                로그인
              </PrimaryButton>
              {sent.devMode && <p className="mt-4 text-center text-xs text-slate-400">개발 모드: 아무 숫자 6자리나 입력하면 통과돼요.</p>}
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>

      <a href="/" className="mt-6 text-xs text-slate-400 transition hover:text-navy">
        사용자 페이지로 이동
      </a>
    </div>
  )
}
