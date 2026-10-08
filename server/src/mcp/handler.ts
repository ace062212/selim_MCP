import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import type { Request, RequestHandler, Response } from 'express'
import { pool } from '../db.js'
import { getSettings } from '../lib/settings.js'
import { authenticateKey, touchKey } from '../services/keys.js'
import { getUserTools } from '../services/tools.js'
import { allow } from './rateLimit.js'
import { runTool } from './runTool.js'
import { TOOLS } from './tools/index.js'

export const SERVER_VERSION = '0.1.0'
const SERVER_INFO = { name: 'selim-mcp', version: SERVER_VERSION }

// User-Agent로 클라이언트 종류 추정 (대시보드 "접속 클라이언트")
function clientName(req: Request) {
  const ua = req.get('user-agent') ?? ''
  if (/claude-code/i.test(ua)) return 'Claude Code'
  if (/cursor/i.test(ua)) return 'Cursor'
  if (/claude/i.test(ua)) return 'Claude Desktop'
  return ua.slice(0, 50) || null
}

// 단건 tools/call 요청이면 도구 이름
function calledTool(body: unknown): string | null {
  const msg = body as { method?: string; params?: { name?: unknown } } | null
  return msg?.method === 'tools/call' && typeof msg.params?.name === 'string' ? msg.params.name : null
}

type LogInput = { userId: number | null; keyId: number | null; tool: string; client: string | null; status: number; latencyMs?: number; error?: string }

async function logCall(l: LogInput) {
  await pool
    .query(
      `INSERT INTO call_logs (user_id, api_key_id, tool_name, client, status, latency_ms, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [l.userId, l.keyId, l.tool, l.client, l.status, l.latencyMs ?? null, l.error?.slice(0, 1000) ?? null],
    )
    .catch((err) => console.error('[call_logs] 기록 실패', err))
}

function rpcError(res: Response, status: number, message: string, id: unknown = null) {
  res.status(status).json({ jsonrpc: '2.0', error: { code: -32000, message }, id })
}

const AUTH_MESSAGES = {
  missing: 'API 키가 없어요. Authorization: Bearer <API 키> 헤더를 넣어 주세요.',
  invalid: '유효하지 않은 API 키예요. 키를 재발급해 주세요.',
  suspended: '관리자가 정지한 키예요. 관리자에게 문의해 주세요.',
  expired: '만료된 키예요. 키를 재발급해 주세요.',
}

// POST /mcp — 요청마다 그 사용자가 쓸 수 있는 도구만 담은 MCP 서버를 만들어 처리 (stateless)
export const mcpHandler: RequestHandler = async (req, res) => {
  const tool = calledTool(req.body)
  const client = clientName(req)
  const rpcId = (req.body as { id?: unknown } | null)?.id ?? null

  const bearer = req.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()
  const auth = await authenticateKey(pool, bearer)
  if (typeof auth === 'string') {
    if (tool) await logCall({ userId: null, keyId: null, tool, client, status: 401, error: auth })
    res.set('WWW-Authenticate', 'Bearer')
    return rpcError(res, 401, AUTH_MESSAGES[auth], rpcId)
  }

  const settings = await getSettings(pool)
  if (!allow(auth.keyId, settings.rateLimitPerMin)) {
    if (tool) await logCall({ userId: auth.userId, keyId: auth.keyId, tool, client, status: 429 })
    return rpcError(res, 429, `요청이 너무 많아요. 1분에 ${settings.rateLimitPerMin}회까지 호출할 수 있어요.`, rpcId)
  }
  void touchKey(pool, auth.keyId)

  // 설명은 관리자가 고친 문구가 있으면 그걸 사용
  const usable = new Map((await getUserTools(pool, auth.userId)).filter((t) => t.enabled).map((t) => [t.name, t.description]))
  if (tool && !usable.has(tool)) {
    await logCall({ userId: auth.userId, keyId: auth.keyId, tool, client, status: 403 })
    return rpcError(res, 403, `'${tool}' 도구를 사용할 수 없어요. 관리자가 껐거나 내 도구 설정에서 꺼져 있어요.`, rpcId)
  }

  const server = new McpServer(SERVER_INFO)
  for (const def of TOOLS.filter((t) => usable.has(t.name))) {
    server.registerTool(def.name, { description: usable.get(def.name), inputSchema: def.inputSchema }, async (args: Record<string, unknown>) => {
      const run = await runTool(def, args, { userId: auth.userId, email: auth.email })
      await logCall({ userId: auth.userId, keyId: auth.keyId, tool: def.name, client, status: run.status, latencyMs: run.latencyMs, error: run.error })
      return run.result
    })
  }

  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })
  res.on('close', () => {
    void transport.close()
    void server.close()
  })
  await server.connect(transport)
  await transport.handleRequest(req, res, req.body)
}

// stateless 모드라 GET(SSE 스트림), DELETE(세션 종료)는 지원하지 않음
export const mcpMethodNotAllowed: RequestHandler = (_req, res) => {
  res.status(405).set('Allow', 'POST').json({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed.' }, id: null })
}

export const toolSpecs = TOOLS.map(({ name, description, category }) => ({ name, description, category }))
