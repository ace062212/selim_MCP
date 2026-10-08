# 05. API

구현: `server/src/routes/` (프론트 호출부: `front/src/lib/api.ts`)

- 세션: `HttpOnly` 쿠키의 JWT ([03-auth.md](03-auth.md))
- 오류 응답: `{ "code": "OTP_EXPIRED", "message": "화면에 그대로 보여줄 수 있는 문장" }`
- 상태 확인: `GET /api/health` → `{ ok, version }`

## 인증

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/api/auth/otp` | 인증번호 발송 `{ email, purpose }` → `{ ttlMinutes, devMode }` |
| POST | `/api/auth/verify` | 인증번호 확인 `{ email, purpose, code }` → 세션 쿠키 |
| GET | `/api/auth/session?kind=user\|admin` | 로그인 상태 확인 |
| POST | `/api/auth/logout` | 세션 종료 `{ kind }` |

`purpose`: `issue`(키 발급), `lookup`(내 키 조회), `settings`(도구 설정), `admin`(관리자 로그인)

## 사용자 (세션 필요)

| 메서드 | 경로 | 설명 | 프론트 위치 |
|---|---|---|---|
| GET | `/api/me/key` | 내 키 정보 (가려진 키만, 없으면 404) | `ApiKeyStep` 조회 |
| POST | `/api/me/key` | 발급 / 재발급. **응답의 `key`(원문)는 이때 한 번만** | `ApiKeyStep` 발급 |
| GET | `/api/me/tools` | 내 도구 목록 `[{ name, description, category, adminEnabled, userEnabled, enabled }]` | `ToolsStep` |
| PUT | `/api/me/tools/{name}` | 내 도구 켜기/끄기 `{ enabled }` | `ToolsStep` |

## 관리자 (관리자 세션 필요)

| 메서드 | 경로 | 설명 | 화면 |
|---|---|---|---|
| GET | `/api/admin/stats` | 요약 수치, 일별 요청 수, 많이 쓰는 도구, 클라이언트 비율 | 대시보드 |
| GET | `/api/admin/activity` | 최근 활동 (`audit_logs`) | 대시보드 |
| GET | `/api/admin/keys` | 살아있는(활성·정지) 키 목록 + 30일 요청 수 | API 키 |
| POST | `/api/admin/keys` | 직접 발급 `{ email }` | API 키 |
| PATCH | `/api/admin/keys/{id}` | 정지/재활성화 `{ status }` | API 키 |
| POST | `/api/admin/keys/{id}/reissue` | 재발급 (새 원문은 이 응답에서 한 번만) | API 키 |
| DELETE | `/api/admin/keys/{id}` | 폐기 (`revoked` 처리, 행은 유지) | API 키 |
| GET | `/api/admin/tools` | 도구 목록 + 7일 통계 | MCP 도구 |
| PATCH | `/api/admin/tools/{name}` | `{ enabled, descriptionOverride }` | MCP 도구 |
| GET | `/api/admin/logs?status=&q=&limit=&offset=` | 호출 기록 `{ total, rows }` | 사용 로그 |
| GET | `/api/admin/logs.csv` | CSV 내보내기 | 사용 로그 |
| GET | `/api/admin/settings` | 전역 설정 | 설정 |
| PUT | `/api/admin/settings` | 전역 설정 저장 | 설정 |

관리자 작업은 모두 `audit_logs`에 기록한다.

## MCP

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/mcp` | MCP Streamable HTTP (stateless, JSON 응답). `Authorization: Bearer <API 키>` |
| GET, DELETE | `/mcp` | 405 (stateless라 SSE 스트림, 세션 종료 없음) |

## 상태 코드 정리

| 코드 | 뜻 |
|---|---|
| 400 | 입력값 오류, 인증번호 틀림/만료 (`code`로 구분) |
| 401 | 세션 만료, API 키 없음/잘못됨/정지/만료 |
| 403 | 관리자 아님, 사용할 수 없는 도구, 자체 발급 꺼짐 |
| 404 | 없는 키·도구 |
| 429 | 인증번호 재요청 제한, MCP 분당 호출 제한 |
