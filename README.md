# Selim MCP

세림티에스지(주) 사내 MCP 서비스. 임직원이 회사 이메일 인증으로 API 키를 발급받아 Claude Code, Claude Desktop, Cursor에서 사내 MCP 도구를 사용한다.

## 폴더 구조

```
.
├── front/   사용자 화면(/) + 관리자 화면(/admin)  — React, Vite, Tailwind
├── doc/     설계 문서
└── sql/     PostgreSQL DDL, 기본 데이터
```

## 현재 상태

- 프론트: 화면 완성, 백엔드 없이 목업 데이터로 동작
- 백엔드(WAS + MCP 서버): 설계 단계 → [`doc/`](doc)
- DB: 스키마 초안 → [`sql/`](sql)

## 프론트 실행

```bash
cd front
npm install
npm run dev        # http://localhost:5173 , 관리자: http://localhost:5173/admin
```
