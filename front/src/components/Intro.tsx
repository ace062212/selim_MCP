import { animate, motion, useMotionTemplate, useMotionValue } from 'framer-motion'
import { useEffect, useState } from 'react'
import NetworkGraphic from './NetworkGraphic'

const EASE = [0.76, 0, 0.24, 1] as const
const TAGLINE = 'MCP GATEWAY'

// 그래픽 화면이 열리기 시작하는 시점(초). 로고/태그라인 등장 시점의 기준
export const INTRO_REVEAL = 1.5
// 로고 등장 시점(초). 태그라인과 인트로 종료는 이 시점 기준
export const LOGO_AT = 1.8

// 회사 홈페이지 슬로건: 새로고침마다 하나를 랜덤으로 보여줌
const SLOGANS = [
  { title: 'G-Cloud No.1 MSP', sub: '1만여 개의 행정·공공기관 클라우드 대전환 사업 리딩' },
  { title: 'Digital Transformation Player', sub: '대한민국 디지털 혁신에 앞장서는 최고의 플레이어' },
]

type Props = { onDone: () => void }

// 네트워크 그래픽 + 슬로건 → 가운데서 원형으로 열리며 로고 등장 → 태그라인이 한 글자씩 등장
export default function Intro({ onDone }: Props) {
  const [slogan] = useState(() => SLOGANS[Math.floor(Math.random() * SLOGANS.length)])

  // 원형 구멍 반지름(vmax)
  const hole = useMotionValue(0)
  const mask = useMotionTemplate`radial-gradient(circle at 50% 50%, transparent calc(${hole}vmax - 6vmax), black ${hole}vmax)`
  const ringSize = useMotionTemplate`max(0px, calc(${hole}vmax * 2 - 6vmax))`

  useEffect(() => {
    const controls = animate(hole, 90, { delay: INTRO_REVEAL, duration: 1.1, ease: [0.65, 0, 0.35, 1] })
    const t = setTimeout(onDone, (LOGO_AT + 2.05) * 1000)
    return () => {
      controls.stop()
      clearTimeout(t)
    }
  }, [hole, onDone])

  return (
    <motion.div className="fixed inset-0 z-50" exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
      {/* 로고 아래 태그라인 */}
      <div className="absolute inset-x-0 top-1/2 mt-24 flex flex-col items-center gap-4 sm:mt-28">
        <motion.div
          className="h-px bg-gradient-to-r from-transparent via-navy/60 to-transparent"
          initial={{ width: 0 }}
          animate={{ width: 220 }}
          transition={{ delay: LOGO_AT + 0.45, duration: 0.8, ease: EASE }}
        />
        <div className="flex gap-[0.35em] text-sm font-semibold tracking-[0.4em] text-navy">
          {TAGLINE.split('').map((ch, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ delay: LOGO_AT + 0.6 + i * 0.05, duration: 0.5 }}
            >
              {ch === ' ' ? ' ' : ch}
            </motion.span>
          ))}
        </div>
      </div>

      {/* 그래픽 화면: 가운데부터 원형으로 뚫리며 사라짐 */}
      <motion.div
        className="absolute inset-0 overflow-hidden bg-[radial-gradient(ellipse_at_center,#16437a_0%,#0c2a50_55%,#071a33_100%)]"
        style={{ maskImage: mask, WebkitMaskImage: mask }}
      >
        <NetworkGraphic />

        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 0, scale: 1.04, filter: 'blur(8px)' }}
            transition={{ delay: INTRO_REVEAL - 0.15, duration: 0.45, ease: 'easeIn' }}
          >
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
              {slogan.title.split(' ').map((word, i) => (
                <span key={i} className="inline-block overflow-hidden pb-1 align-bottom">
                  <motion.span
                    className="inline-block"
                    initial={{ y: '110%' }}
                    animate={{ y: 0 }}
                    transition={{ delay: 0.15 + i * 0.07, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {word}
                    {' '}
                  </motion.span>
                </span>
              ))}
            </h1>
            <motion.p
              className="mt-4 text-base text-sky-200/85 sm:text-lg"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.45 }}
            >
              {slogan.sub}
            </motion.p>
          </motion.div>
        </div>
      </motion.div>

      {/* 열리는 원 가장자리에 빛나는 링 */}
      <motion.div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky/70 shadow-[0_0_40px_8px_rgb(114_170_220/0.35)]"
        style={{ width: ringSize, height: ringSize }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ delay: INTRO_REVEAL, duration: 1.1, times: [0, 0.2, 1] }}
      />
    </motion.div>
  )
}
