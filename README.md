# Selim MCP

세림티에스지(주) 사내 MCP 서비스. 임직원이 회사 이메일 인증으로 API 키를 발급받아 Claude Code, Claude Desktop, Cursor에서 사내 MCP 도구를 사용한다.

## 폴더 구조

```
.
├── front/    사용자 화면(/) + 관리자 화면(/admin)  — React, Vite, Tailwind
├── server/   API(/api) + MCP 서버(/mcp)            — Node.js, Express, MCP SDK
├── sql/      PostgreSQL DDL, 기본 데이터
└── doc/      설계 문서, 설치·이전 가이드
```

## 현재 상태

| 항목 | 상태 |
|---|---|
| 사용자 화면 | 키 발급(원문 1회 표시), 내 키 조회·재발급, 내 도구 켜기/끄기 |
| 관리자 화면 | 로그인, 대시보드, API 키 관리, 도구 켜기/끄기·설명 수정, 사용 로그(CSV), 설정 |
| MCP 서버 | API 키 인증, 사용자별 도구 필터, 분당 호출 제한, 호출 기록 |
| 메일 발송 | **미구현** — 인증번호를 서버 로그에 출력 (개발 모드에선 아무 6자리 통과) |
| MCP 도구 | 예시 3개 (`current_time`, `whoami`, `my_usage`) |

## 빠른 시작

자세한 내용은 [doc/06-setup.md](doc/06-setup.md).

```bash
# server/.env 작성 (server/.env.example 참고)
cd server && npm install && npm run dev:local   # 개발용 DB + 마이그레이션 + 서버(:8080)
cd front  && npm install && npm run dev         # :5173 (사용자), :5173/admin (관리자)
```
