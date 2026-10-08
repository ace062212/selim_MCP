import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import type { z } from 'zod'

export type ToolContext = {
  userId: number
  email: string
  // 제한 시간이 지나면 abort됨. 외부 API 호출(fetch 등)에 넘기면 같이 멈춤
  signal: AbortSignal
}

export type ToolDef = {
  name: string
  description: string
  category: string
  inputSchema: z.ZodRawShape
  // 실행 제한 시간(ms). 없으면 기본값 (runTool.ts)
  timeoutMs?: number
  handler: (args: Record<string, unknown>, ctx: ToolContext) => Promise<CallToolResult>
}

// 입력 형식(inputSchema)에 맞춰 handler의 args 타입을 잡아주는 도우미
export function defineTool<S extends z.ZodRawShape>(def: {
  name: string
  description: string
  category: string
  inputSchema: S
  timeoutMs?: number
  handler: (args: z.infer<z.ZodObject<S>>, ctx: ToolContext) => Promise<CallToolResult>
}): ToolDef {
  return def as unknown as ToolDef
}

export const text = (value: string): CallToolResult => ({ content: [{ type: 'text', text: value }] })

// 사용자에게 그대로 보여줘도 되는 오류 (예: "검색어가 너무 짧아요")
// 다른 오류는 내용이 숨겨지고 사용 로그에만 남음
export class ToolError extends Error {}
