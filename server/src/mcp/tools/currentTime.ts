import { z } from 'zod'
import { defineTool, text } from './types.js'

export default defineTool({
  name: 'current_time',
  description: '현재 한국 시간(KST)의 날짜, 시각, 요일을 알려줘요. "오늘", "이번 주" 같은 표현을 날짜로 바꿀 때 사용해요.',
  category: '유틸',
  inputSchema: {
    offsetDays: z.number().int().min(-365).max(365).optional().describe('오늘 기준 며칠 뒤(음수면 며칠 전) 날짜를 알고 싶을 때'),
  },
  async handler({ offsetDays = 0 }) {
    const date = new Date(Date.now() + offsetDays * 86_400_000)
    const formatted = new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      dateStyle: 'full',
      timeStyle: offsetDays ? undefined : 'medium',
    }).format(date)
    return text(formatted)
  },
})
