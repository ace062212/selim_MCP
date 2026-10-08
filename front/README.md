# front

사용자 화면(`/`)과 관리자 화면(`/admin`).

```bash
npm install
npm run dev     # 개발 서버
npm run build   # dist/ 에 빌드
npm run lint
```

| 경로 | 내용 |
|---|---|
| `src/App.tsx`, `src/components/` | 사용자 화면: 인트로 → 이메일 → 인증번호 → API 키 |
| `src/admin/` | 관리자 화면: 대시보드, API 키, MCP 도구, 사용 로그, 설정 |
| `src/lib/` | 키 저장(목업), 설정값 |

지금은 백엔드 없이 동작한다 (아무 이메일, 아무 6자리 통과 / 키는 브라우저 localStorage). 실제 API로 바꿀 곳은 [`doc/05-api.md`](../doc/05-api.md) 참고.
