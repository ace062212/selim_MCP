# 05. API 초안

프론트가 지금 목업 데이터로 하는 동작을 실제 API로 옮길 때의 목록이다. 세부 요청/응답 형식은 백엔드 구현 시 확정한다.

- 세션: `HttpOnly` 쿠키의 JWT ([03-auth.md](03-auth.md))
- 오류 응답: `{ "code": "OTP_EXPIRED", "message": "..." }`

## 인증

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/api/auth/otp` | 인증번호 발송 `{ email, purpose }` |
| POST | `/api/auth/verify` | 인증번호 확인 `{ email, code }` → 세션 쿠키 |
| POST | `/api/auth/logout` | 세션 종료 |

## 사용자 (세션 필요)

| 메서드 | 경로 | 설명 | 프론트 위치 |
|---|---|---|---|
| GET | `/api/me/key` | 내 키 조회 (없으면 404) | `ApiKeyStep` 조회 모드 |
| POST | `/api/me/key` | 키 발급 (있으면 재발급) | `ApiKeyStep` 발급 모드 |
| GET | `/api/me/tools` | 내 도구 목록 `[{ name, description, adminEnabled, userEnabled }]` | 도구 설정 (예정) |
| PUT | `/api/me/tools/{name}` | 내 도구 켜기/끄기 `{ enabled }` | 도구 설정 (예정) |

## 관리자 (관리자 세션 필요)

| 메서드 | 경로 | 설명 | 화면 |
|---|---|---|---|
| GET | `/api/admin/stats` | 요약 수치, 일별 요청 수, 많이 쓰는 도구, 클라이언트 비율 | 대시보드 |
| GET | `/api/admin/activity` | 최근 활동 (`audit_logs`) | 대시보드 |
| GET | `/api/admin/keys?status=&q=` | 키 목록 | API 키 |
| POST | `/api/admin/keys` | 직접 발급 `{ email }` | API 키 |
| PATCH | `/api/admin/keys/{id}` | 정지/재활성화 `{ status }` | API 키 |
| POST | `/api/admin/keys/{id}/reissue` | 재발급 | API 키 |
| DELETE | `/api/admin/keys/{id}` | 폐기 (`revoked` 처리, 행은 유지) | API 키 |
| GET | `/api/admin/tools` | 도구 목록 + 7일 통계 | MCP 도구 |
| PATCH | `/api/admin/tools/{name}` | `{ enabled, descriptionOverride }` | MCP 도구 |
| GET | `/api/admin/logs?status=&q=&cursor=` | 호출 기록 (커서 페이지네이션) | 사용 로그 |
| GET | `/api/admin/logs.csv` | CSV 내보내기 | 사용 로그 |
| GET | `/api/admin/settings` | 전역 설정 | 설정 |
| PUT | `/api/admin/settings` | 전역 설정 저장 | 설정 |

관리자 작업은 모두 `audit_logs`에 기록한다.

## MCP

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/mcp` | MCP Streamable HTTP 엔드포인트. `Authorization: Bearer <API 키>` |

## 프론트 연동 위치

목업을 실제 API로 바꿀 곳 (코드에 `TODO` 주석 있음):

| 파일 | 바꿀 내용 |
|---|---|
| `front/src/lib/keyStore.ts` | localStorage → `/api/me/key` |
| `front/src/components/EmailStep.tsx` | 가짜 대기 → `/api/auth/otp` |
| `front/src/components/OtpStep.tsx` | 아무 6자리 통과 → `/api/auth/verify` |
| `front/src/admin/mockData.ts` | 예시 데이터 → `/api/admin/*` |
| `front/src/lib/config.ts` | MCP 서버 실제 주소 |
