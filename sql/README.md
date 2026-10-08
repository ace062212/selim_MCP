# SQL

PostgreSQL 14 이상 기준. 설계 설명은 [`doc/02-database.md`](../doc/02-database.md).

```
sql/
├── ddl/    스키마 (번호 순서대로 실행)
└── seed/   기본 데이터
```

## 실행

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f sql/ddl/001_init.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f sql/seed/001_default_settings.sql
```

## 규칙

- 이미 배포된 DDL 파일은 고치지 않는다. 변경은 새 번호 파일로 추가 (`002_add_xxx.sql`).
- 파일 하나는 `BEGIN; ... COMMIT;`으로 감싸서 중간 실패 시 전부 되돌린다.
- seed는 여러 번 실행해도 안전하게 (`ON CONFLICT DO NOTHING`).
