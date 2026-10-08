import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { ToolError, type ToolContext, type ToolDef } from './tools/types.js'

export const DEFAULT_TIMEOUT_MS = 30_000

const GENERIC_ERROR = '도구 실행 중 오류가 발생했어요. 잠시 후 다시 시도하거나 관리자에게 문의해 주세요.'

export type ToolRun = {
  result: CallToolResult
  status: 200 | 400 | 500 | 504
  latencyMs: number
  // 사용 로그에 남길 원래 오류 내용 (사용자에게는 안 보임)
  error?: string
}

const failure = (message: string): CallToolResult => ({ isError: true, content: [{ type: 'text', text: message }] })

// 도구 실행: 제한 시간 적용, 오류 내용은 숨기고 로그용으로만 반환
export async function runTool(def: ToolDef, args: Record<string, unknown>, ctx: Omit<ToolContext, 'signal'>): Promise<ToolRun> {
  const started = Date.now()
  const timeoutMs = def.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const controller = new AbortController()
  let timer: NodeJS.Timeout | undefined
  const timeout = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => {
      controller.abort()
      resolve('timeout')
    }, timeoutMs)
  })

  try {
    const outcome = await Promise.race([def.handler(args, { ...ctx, signal: controller.signal }), timeout])
    const latencyMs = Date.now() - started
    if (outcome === 'timeout') {
      return {
        result: failure(`도구 응답이 너무 오래 걸려서 중단했어요. (${timeoutMs / 1000}초 제한)`),
        status: 504,
        latencyMs,
        error: `timeout after ${timeoutMs}ms`,
      }
    }
    return { result: outcome, status: outcome.isError ? 500 : 200, latencyMs }
  } catch (err) {
    const latencyMs = Date.now() - started
    if (err instanceof ToolError) return { result: failure(err.message), status: 400, latencyMs, error: err.message }
    console.error(`[tool:${def.name}]`, err)
    const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
    return { result: failure(GENERIC_ERROR), status: 500, latencyMs, error: detail }
  } finally {
    clearTimeout(timer)
  }
}
