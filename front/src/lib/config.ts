// 사용자에게 안내할 MCP 서버 주소
// 기본은 이 페이지와 같은 주소의 /mcp (서버가 프론트를 같이 내려주는 구성). 다르면 빌드 시 VITE_MCP_URL로 지정
export const MCP_URL = import.meta.env.VITE_MCP_URL || `${window.location.origin}/mcp`
