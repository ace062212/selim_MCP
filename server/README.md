# server

API(`/api`)와 MCP(`/mcp`) 서버. 프론트 빌드 결과물(`FRONT_DIST`)이 있으면 화면도 같이 내려준다.

```bash
cp .env.example .env    # 값 채우기
npm install
npm run db:migrate      # sql/ddl, sql/seed 적용
npm run dev             # 개발 (:8080, 저장하면 재시작)
npm run build && npm start   # 운영
```

| 경로 | 내용 |
|---|---|
| `src/index.ts` | 진입점: 라우터 연결, 도구 동기화, 최초 관리자 등록 |
| `src/routes/` | `auth`(인증번호·세션), `me`(내 키·도구), `admin`(관리자) |
| `src/mcp/handler.ts` | `/mcp`: API 키 인증 → 호출 제한 → 사용자별 도구로 응답 |
| `src/mcp/tools/` | MCP 도구. 추가 방법은 [`doc/07-adding-tools.md`](../doc/07-adding-tools.md) |
| `src/lib/mailer.ts` | 인증번호 메일 발송 (**미구현**: 지금은 로그 출력) |
| `src/services/` | 키 발급·인증, 도구 동기화, 사용자, 정리 작업 |

설치·운영 이전은 [`doc/06-setup.md`](../doc/06-setup.md).
