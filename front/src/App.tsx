import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import { useCallback, useState } from 'react'
import logo from './assets/selim-logo.png'
import ApiKeyStep from './components/ApiKeyStep'
import Background from './components/Background'
import EmailStep, { type Mode } from './components/EmailStep'
import Intro, { LOGO_AT } from './components/Intro'
import OtpStep from './components/OtpStep'
import ToolsStep from './components/ToolsStep'
import { api, type IssuedKey, type KeyInfo } from './lib/api'

type Step = 'email' | 'otp' | 'done'
const STEP_ORDER: Step[] = ['email', 'otp', 'done']
const LOGO_FLIGHT_MS = 1000

const slide = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 40, filter: 'blur(4px)' }),
  center: { opacity: 1, x: 0, filter: 'blur(0px)' },
  exit: (dir: number) => ({ opacity: 0, x: dir * -40, filter: 'blur(4px)' }),
}

export default function App() {
  const [introDone, setIntroDone] = useState(false)
  // 로고가 상단에 안착한 뒤에만 header 위치 애니메이션을 켬 (안 그러면 로고 이동과 겹쳐 곡선으로 휨)
  const [logoSettled, setLogoSettled] = useState(false)
  // 카드 내용 교체 시점에 App을 다시 렌더해 header/main이 위치 변화를 감지하게 함
  const [, setSwapCount] = useState(0)
  const [step, setStep] = useState<Step>('email')
  const [dir, setDir] = useState(1)
  const [email, setEmail] = useState('')
  const [mode, setMode] = useState<Mode>('issue')
  const [otp, setOtp] = useState({ ttlMinutes: 3, devMode: false })
  const [keyInfo, setKeyInfo] = useState<KeyInfo | IssuedKey | null>(null)

  const finishIntro = useCallback(() => {
    setIntroDone(true)
    setTimeout(() => setLogoSettled(true), LOGO_FLIGHT_MS)
  }, [])
  const go = (next: Step) => {
    setDir(STEP_ORDER.indexOf(next) >= STEP_ORDER.indexOf(step) ? 1 : -1)
    setStep(next)
  }
  const stepIndex = STEP_ORDER.indexOf(step)

  const stepLabels = ['이메일', '인증', mode === 'settings' ? '도구 설정' : 'API 키']

  // 인증 통과 후: 발급이면 바로 발급, 조회면 내 키 정보, 도구 설정은 화면에서 직접 불러옴
  const handleVerified = async () => {
    if (mode === 'issue') setKeyInfo(await api.issueMyKey())
    else if (mode === 'lookup') setKeyInfo(await api.myKey())
    go('done')
  }

  const reset = () => {
    void api.logout('user').catch(() => {})
    setEmail('')
    setKeyInfo(null)
    go('email')
  }

  return (
    <LayoutGroup>
      <Background />
      <AnimatePresence>{!introDone && <Intro onDone={finishIntro} />}</AnimatePresence>

      {/* 인트로: 화면 중앙의 큰 로고 → 끝나면 같은 layoutId로 상단으로 날아감 */}
      {!introDone && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <motion.img
            layoutId="logo"
            src={logo}
            alt="세림티에스지"
            className="w-64 sm:w-80"
            initial={{ opacity: 0, scale: 0.85, filter: 'blur(12px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ delay: LOGO_AT, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      )}

      <div className="flex min-h-full flex-col items-center justify-center px-4 py-10 sm:py-14">
        <motion.header layout={logoSettled ? 'position' : false} className="mb-8 flex h-16 w-full justify-center sm:h-20">
          {introDone && (
            <motion.img
              layoutId="logo"
              src={logo}
              alt="세림티에스지"
              className="h-16 w-auto sm:h-20"
              transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
            />
          )}
        </motion.header>

        <AnimatePresence>
          {introDone && (
            <motion.main
              layout="position"
              className="w-full max-w-lg"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* 진행 단계 */}
              <div className="mb-5 flex items-center justify-center gap-2">
                {stepLabels.map((label, i) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <motion.span
                        className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
                        animate={{
                          backgroundColor: i <= stepIndex ? '#16437a' : '#e2e8f0',
                          color: i <= stepIndex ? '#ffffff' : '#64748b',
                        }}
                      >
                        {i + 1}
                      </motion.span>
                      <span className={`text-xs font-medium ${i <= stepIndex ? 'text-navy' : 'text-slate-400'}`}>
                        {label}
                      </span>
                    </div>
                    {i < stepLabels.length - 1 && (
                      <div className="relative h-px w-8 bg-slate-200">
                        <motion.div
                          className="absolute inset-y-0 left-0 bg-navy"
                          animate={{ width: i < stepIndex ? '100%' : '0%' }}
                          transition={{ duration: 0.4 }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <motion.div
                layout
                transition={{ layout: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }}
                className="overflow-hidden rounded-lg border border-white/60 bg-white/75 p-7 shadow-2xl shadow-navy/10 ring-1 ring-slate-900/5 backdrop-blur-xl sm:p-9"
              >
                <AnimatePresence
                  mode="wait"
                  custom={dir}
                  initial={false}
                  onExitComplete={() => setSwapCount((c) => c + 1)}
                >
                  <motion.div
                    key={step}
                    custom={dir}
                    variants={slide}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  >
                    {step === 'email' && (
                      <EmailStep
                        mode={mode}
                        onModeChange={setMode}
                        defaultEmail={email}
                        onSubmit={(e, info) => {
                          setEmail(e)
                          setOtp(info)
                          go('otp')
                        }}
                      />
                    )}
                    {step === 'otp' && (
                      <OtpStep
                        email={email}
                        mode={mode}
                        ttlMinutes={otp.ttlMinutes}
                        devMode={otp.devMode}
                        onBack={() => go('email')}
                        onVerified={handleVerified}
                      />
                    )}
                    {step === 'done' && mode === 'settings' && <ToolsStep email={email} onReset={reset} />}
                    {step === 'done' && mode !== 'settings' && (
                      <ApiKeyStep email={email} keyInfo={keyInfo} onKeyChange={setKeyInfo} onReset={reset} />
                    )}
                  </motion.div>
                </AnimatePresence>
              </motion.div>

              <p className="mt-6 text-center text-xs text-slate-400">© 세림티에스지(주) · 사내 전용 서비스</p>
            </motion.main>
          )}
        </AnimatePresence>
      </div>
    </LayoutGroup>
  )
}
