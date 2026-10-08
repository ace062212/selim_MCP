import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import type { z } from 'zod'

export type ToolContext = { userId: number; email: string }

export type ToolDef = {
  name: string
  description: string
  category: string
  inputSchema: z.ZodRawShape
  handler: (args: Record<string, unknown>, ctx: ToolContext) => Promise<CallToolResult>
}

// 입력 형식(inputSchema)에 맞춰 handler의 args 타입을 잡아주는 도우미
export function defineTool<S extends z.ZodRawShape>(def: {
  name: string
  description: string
  category: string
  inputSchema: S
  handler: (args: z.infer<z.ZodObject<S>>, ctx: ToolContext) => Promise<CallToolResult>
}): ToolDef {
  return def as unknown as ToolDef
}

export const text = (value: string): CallToolResult => ({ content: [{ type: 'text', text: value }] })
