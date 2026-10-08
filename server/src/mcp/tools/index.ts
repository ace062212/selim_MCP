// MCP 도구 목록. 새 도구는 이 폴더에 파일을 만들고 아래 배열에 추가
// 서버가 시작될 때 이 목록이 DB tools 테이블에 동기화됨 (doc/04-tool-policy.md)
import currentTime from './currentTime.js'
import myUsage from './myUsage.js'
import type { ToolDef } from './types.js'
import whoami from './whoami.js'

export const TOOLS: ToolDef[] = [currentTime, whoami, myUsage]
