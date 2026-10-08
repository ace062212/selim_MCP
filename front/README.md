# front

사용자 화면(`/`)과 관리자 화면(`/admin`).

```bash
npm install
npm run dev     # 개발 서버 (:5173). /api, /mcp는 server(:8080)로 전달
npm run build   # dist/ 에 빌드 → server가 같이 내려줌
npm run lint
```

| 경로 | 내용 |
|---|---|
| `src/App.tsx`, `src/components/` | 사용자 화면: 인트로 → 이메일 → 인증번호 → API 키 / 도구 설정 |
| `src/admin/` | 관리자 화면: 로그인, 대시보드, API 키, MCP 도구, 사용 로그, 설정 |
| `src/lib/api.ts` | 서버 API 호출 (목록은 [`doc/05-api.md`](../doc/05-api.md)) |
| `src/lib/config.ts` | 화면에 안내하는 MCP 주소 (기본: 현재 주소 + `/mcp`, `VITE_MCP_URL`로 변경) |
