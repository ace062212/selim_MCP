import { motion } from 'framer-motion'

// 은은하게 떠다니는 브랜드 컬러 블롭 + 격자
export default function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-gradient-to-b from-white via-sky-soft/40 to-white">
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgb(22 67 122 / 0.07) 1px, transparent 1px), linear-gradient(to bottom, rgb(22 67 122 / 0.07) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 100%)',
        }}
      />
      <motion.div
        className="absolute -top-40 -left-32 h-[32rem] w-[32rem] rounded-full bg-sky/30 blur-3xl"
        animate={{ x: [0, 60, -20, 0], y: [0, 40, 80, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -right-40 top-1/3 h-[28rem] w-[28rem] rounded-full bg-navy/15 blur-3xl"
        animate={{ x: [0, -50, 20, 0], y: [0, -40, 30, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-40 left-1/3 h-[26rem] w-[26rem] rounded-full bg-sky/20 blur-3xl"
        animate={{ x: [0, 40, -40, 0], y: [0, -30, 0, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}
