import { z } from 'zod'
import { pool } from '../../db.js'
import { defineTool, text } from './types.js'

export default defineTool({
  name: 'my_usage',
  description: '내가 최근 며칠 동안 사내 MCP 도구를 몇 번 호출했는지 도구별로 보여줘요.',
  category: '계정',
  inputSchema: {
    days: z.number().int().min(1).max(90).default(7).describe('최근 며칠 (기본 7일)'),
  },
  async handler({ days }, { userId }) {
    const { rows } = await pool.query<{ tool_name: string; calls: number; errors: number }>(
      `SELECT tool_name, count(*)::int AS calls, count(*) FILTER (WHERE status >= 400)::int AS errors
         FROM call_logs
        WHERE user_id = $1 AND called_at > now() - make_interval(days => $2)
        GROUP BY tool_name ORDER BY calls DESC`,
      [userId, days],
    )
    if (!rows.length) return text(`최근 ${days}일 동안 호출 기록이 없어요.`)
    return text(
      [`최근 ${days}일 호출 수`, ...rows.map((r) => `- ${r.tool_name}: ${r.calls}회${r.errors ? ` (실패 ${r.errors})` : ''}`)].join('\n'),
    )
  },
})
