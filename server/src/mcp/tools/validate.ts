import type { ToolDef } from './types.js'

// MCP 도구 이름 규칙: 영문 소문자로 시작, 소문자·숫자·밑줄, 최대 64자
const NAME_RE = /^[a-z][a-z0-9_]{0,63}$/

// 서버 시작 시 검사. 잘못된 도구가 있으면 시작하지 않음 (요청마다 실패하는 것보다 나음)
export function validateTools(tools: ToolDef[]) {
  const problems: string[] = []
  const seen = new Set<string>()
  for (const t of tools) {
    if (!NAME_RE.test(t.name)) problems.push(`'${t.name}': 이름은 영문 소문자로 시작하고 소문자·숫자·밑줄만 (최대 64자)`)
    if (seen.has(t.name)) problems.push(`'${t.name}': 같은 이름의 도구가 두 번 들어 있음`)
    seen.add(t.name)
    if (!t.description?.trim()) problems.push(`'${t.name}': 설명(description)이 비어 있음`)
    if (!t.category?.trim()) problems.push(`'${t.name}': 분류(category)가 비어 있음`)
    if (t.timeoutMs !== undefined && !(t.timeoutMs > 0 && t.timeoutMs <= 300_000)) problems.push(`'${t.name}': timeoutMs는 1~300000 사이`)
  }
  if (problems.length) {
    throw new Error(`MCP 도구 정의 오류 (server/src/mcp/tools/index.ts 확인):\n- ${problems.join('\n- ')}`)
  }
}
