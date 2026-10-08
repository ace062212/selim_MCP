// 연결 설정 화면의 클라이언트별 설정. 새 클라이언트는 여기에 항목만 추가하면 됨
// 형식은 각 공식 문서 기준 (2026-10 확인). 클라이언트가 형식을 바꾸면 여기만 고치면 됨

export type McpClient = {
  id: string
  label: string
  // 설정을 어디에 넣는지 안내
  where: string
  build: (url: string, key: string) => string
  note?: string
}

const SERVER_NAME = 'selim'
const json = (value: unknown) => JSON.stringify(value, null, 2)

export const MCP_CLIENTS: McpClient[] = [
  {
    id: 'claude-code',
    label: 'Claude Code',
    where: '터미널에서 실행',
    build: (url, key) => `claude mcp add --transport http ${SERVER_NAME} ${url} \\\n  --header "Authorization: Bearer ${key}"`,
  },
  {
    id: 'claude-desktop',
    label: 'Claude Desktop',
    where: '설정 > 개발자 > 설정 편집 → claude_desktop_config.json에 추가',
    // Claude Desktop 설정 파일은 실행 명령 방식만 지원해서 mcp-remote로 연결
    build: (url, key) =>
      json({
        mcpServers: {
          [SERVER_NAME]: {
            command: 'npx',
            args: ['-y', 'mcp-remote', url, '--header', 'Authorization:${AUTH_HEADER}'],
            env: { AUTH_HEADER: `Bearer ${key}` },
          },
        },
      }),
    note: 'Node.js가 설치돼 있어야 해요. 저장 후 Claude Desktop을 다시 시작하세요.',
  },
  {
    id: 'cursor',
    label: 'Cursor',
    where: '~/.cursor/mcp.json에 추가',
    build: (url, key) => json({ mcpServers: { [SERVER_NAME]: { url, headers: { Authorization: `Bearer ${key}` } } } }),
  },
  {
    id: 'codex',
    label: 'Codex CLI',
    where: '~/.codex/config.toml에 추가',
    build: (url, key) => `[mcp_servers.${SERVER_NAME}]\nurl = "${url}"\nhttp_headers = { "Authorization" = "Bearer ${key}" }`,
  },
  {
    id: 'gemini',
    label: 'Gemini CLI',
    where: '터미널에서 실행',
    build: (url, key) => `gemini mcp add --transport http \\\n  --header "Authorization: Bearer ${key}" \\\n  ${SERVER_NAME} ${url}`,
  },
  {
    id: 'vscode',
    label: 'VS Code',
    where: '.vscode/mcp.json에 추가 (GitHub Copilot 에이전트 모드)',
    build: (url, key) => json({ servers: { [SERVER_NAME]: { type: 'http', url, headers: { Authorization: `Bearer ${key}` } } } }),
  },
]
