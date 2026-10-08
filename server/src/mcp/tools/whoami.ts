import { pool } from '../../db.js'
import { getLiveKey } from '../../services/keys.js'
import { getUserTools } from '../../services/tools.js'
import { defineTool, text } from './types.js'

export default defineTool({
  name: 'whoami',
  description: '지금 연결된 사내 MCP 계정 정보(이메일, 키 발급일, 사용 가능한 도구)를 보여줘요.',
  category: '계정',
  inputSchema: {},
  async handler(_args, { userId, email }) {
    const [key, tools] = await Promise.all([getLiveKey(pool, userId), getUserTools(pool, userId)])
    const usable = tools.filter((t) => t.enabled).map((t) => t.name)
    return text(
      [
        `이메일: ${email}`,
        `키: ${key?.masked ?? '-'} (발급 ${key?.issuedAt.toISOString().slice(0, 10) ?? '-'})`,
        `사용 가능한 도구: ${usable.join(', ') || '없음'}`,
      ].join('\n'),
    )
  },
})
