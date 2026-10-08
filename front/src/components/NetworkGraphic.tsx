import { motion } from 'framer-motion'
import { mulberry32 } from '../lib/random'

// 클라우드 네트워크 느낌의 별자리 그래픽 (노드 + 연결선 + 흐르는 데이터 점)
const W = 1600
const H = 900
const CX = W / 2
const CY = H / 2

type Node = { x: number; y: number; r: number; d: number; bright: boolean }
type Edge = { a: Node; b: Node; d: number }

function buildGraph() {
  // 새로고침해도 모양이 같도록 고정 시드 사용
  const rand = mulberry32(20261007)
  const nodes: Node[] = []
  // 격자에 흔들림을 줘서 고르게 퍼지도록 배치
  const cols = 11
  const rows = 7
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      if (rand() < 0.22) continue
      const x = ((i + 0.5 + (rand() - 0.5) * 0.8) / cols) * W
      const y = ((j + 0.5 + (rand() - 0.5) * 0.8) / rows) * H
      const d = Math.hypot(x - CX, (y - CY) * 1.6) / Math.hypot(CX, CY * 1.6)
      nodes.push({ x, y, r: 1.5 + rand() * 2.5, d, bright: rand() < 0.25 })
    }
  }
  const edges: Edge[] = []
  nodes.forEach((a, i) => {
    nodes.slice(i + 1).forEach((b) => {
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      if (dist < 230 && rand() < 0.7) edges.push({ a, b, d: Math.min(a.d, b.d) })
    })
  })
  return { nodes, edges }
}

const { nodes, edges } = buildGraph()
const packets = edges.filter((_, i) => i % 7 === 0).slice(0, 14)

export default function NetworkGraphic() {
  return (
    <>
      {/* 중앙에서 퍼지는 빛 */}
      <motion.div
        className="absolute top-1/2 left-1/2 h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgb(114_170_220/0.35)_0%,transparent_65%)]"
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.6, ease: 'easeOut' }}
      />
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <defs>
          <radialGradient id="ng-vignette" cx="50%" cy="50%" r="45%">
            <stop offset="0%" stopColor="#0c2a50" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#0c2a50" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 중앙을 도는 궤도 링 */}
        {[260, 380].map((r, i) => (
          <motion.circle
            key={r}
            cx={CX}
            cy={CY}
            r={r}
            fill="none"
            stroke="#72aadc"
            strokeOpacity={0.18}
            strokeDasharray={i === 0 ? '2 10' : '80 24'}
            initial={{ rotate: 0, opacity: 0 }}
            animate={{ rotate: i === 0 ? 90 : -60, opacity: 1 }}
            transition={{ rotate: { duration: 6, ease: 'linear' }, opacity: { duration: 0.8 } }}
            style={{ transformOrigin: `${CX}px ${CY}px` }}
          />
        ))}

        {/* 연결선: 중앙에서 바깥으로 차례로 그려짐 */}
        {edges.map((e, i) => (
          <motion.line
            key={i}
            x1={e.a.x}
            y1={e.a.y}
            x2={e.b.x}
            y2={e.b.y}
            stroke="#72aadc"
            strokeWidth={1}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.32 }}
            transition={{ delay: 0.1 + e.d * 0.6, duration: 0.6, ease: 'easeOut' }}
          />
        ))}

        {/* 노드 */}
        {nodes.map((n, i) => (
          <motion.circle
            key={i}
            cx={n.x}
            cy={n.y}
            r={n.bright ? n.r + 1 : n.r}
            fill={n.bright ? '#ffffff' : '#72aadc'}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: n.bright ? 0.9 : 0.6 }}
            transition={{ delay: 0.05 + n.d * 0.6, duration: 0.4, ease: 'backOut' }}
            style={{ transformOrigin: `${n.x}px ${n.y}px` }}
          />
        ))}
        {nodes
          .filter((n) => n.bright)
          .map((n, i) => (
            <motion.circle
              key={`halo-${i}`}
              cx={n.x}
              cy={n.y}
              r={n.r + 8}
              fill="none"
              stroke="#ffffff"
              strokeOpacity={0.35}
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: [0.3, 1.6], opacity: [0.6, 0] }}
              transition={{ delay: 0.2 + n.d * 0.6, duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
              style={{ transformOrigin: `${n.x}px ${n.y}px` }}
            />
          ))}

        {/* 선을 따라 흐르는 데이터 점 */}
        {packets.map((e, i) => (
          <motion.circle
            key={`p-${i}`}
            r={2.5}
            fill="#ffffff"
            initial={{ cx: e.a.x, cy: e.a.y, opacity: 0 }}
            animate={{ cx: [e.a.x, e.b.x], cy: [e.a.y, e.b.y], opacity: [0, 1, 0] }}
            transition={{ delay: 0.6 + e.d * 0.6 + (i % 4) * 0.15, duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}

        {/* 글자 가독성을 위해 중앙을 살짝 어둡게 */}
        <rect width={W} height={H} fill="url(#ng-vignette)" />
      </svg>
    </>
  )
}
