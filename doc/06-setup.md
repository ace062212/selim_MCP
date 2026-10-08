# 06. 설치·실행·서버 이전 가이드

로컬 PC에서 개발하다가 나중에 회사 서버로 옮길 때 이 문서 순서대로 하면 된다.

## 구성

```
selim_MCP/
├── front/    화면 (React, Vite)       → 빌드하면 정적 파일(front/dist)
├── server/   API + MCP 서버 (Node.js) → front/dist도 같이 내려줌
├── sql/      DB 스키마 (PostgreSQL)
└── doc/      설계 문서
```

운영에서는 **서버 프로세스 1개 + PostgreSQL 1개**만 있으면 된다. 서버가 화면(`/`, `/admin`), API(`/api`), MCP(`/mcp`)를 모두 처리한다.

## 필요한 프로그램

| 프로그램 | 버전 | 확인 |
|---|---|---|
| Node.js | 20 이상 (개발: 24) | `node -v` |
| PostgreSQL | 14 이상 (권장 16) | `psql --version` |
| Git | 아무거나 | `git --version` |

---

## 1. 코드 받기

```bash
git clone https://github.com/ace062212/selim_MCP.git
cd selim_MCP
```

## 2. DB 만들기

### 로컬 개발: 설치 없이 바로 (PGlite)

PostgreSQL을 설치하지 않아도 된다. 개발용 DB(PGlite, WASM으로 돌아가는 PostgreSQL)가 서버 패키지에 들어 있다.

```bash
cd server
npm install
cp .env.example .env   # DATABASE_URL을 postgres://postgres:postgres@127.0.0.1:54329/postgres 로
npm run dev:local      # DB 시작(:54329) → 마이그레이션 → 서버 실행(:8080)을 한 번에
```

- 데이터는 `server/.pgdata/`에 저장돼서 껐다 켜도 남는다 (저장소에는 안 올라감). 초기화하려면 서버를 끄고 이 폴더를 지우면 된다.
- 개발용이라 **운영에서는 쓰지 않는다.** 운영은 아래처럼 진짜 PostgreSQL을 쓴다.
- DB만 따로 띄우려면 `npm run db:local`.

### PostgreSQL (운영, 또는 로컬에서도 실제 환경과 똑같이 하고 싶을 때)

PostgreSQL 관리자 계정으로 전용 계정과 DB를 만든다. 비밀번호는 직접 정해서 바꿀 것.

```bash
sudo -u postgres psql <<'SQL'
CREATE ROLE selim_mcp LOGIN PASSWORD '여기에-비밀번호';
CREATE DATABASE selim_mcp OWNER selim_mcp;
SQL
```

> PostgreSQL 설치가 어려우면 Docker로 띄워도 된다.
> ```bash
> docker run -d --name selim-mcp-db --restart unless-stopped \
>   -e POSTGRES_USER=selim_mcp -e POSTGRES_PASSWORD=여기에-비밀번호 -e POSTGRES_DB=selim_mcp \
>   -p 5432:5432 -v selim-mcp-db:/var/lib/postgresql/data postgres:16
> ```

## 3. 서버 설정

```bash
cd server
npm install
cp .env.example .env
```

`.env`를 열어서 채운다.

```bash
# 비밀값 2개는 각각 아래 명령으로 만든 값을 넣기
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

| 항목 | 로컬 개발 | 운영 서버 |
|---|---|---|
| `DATABASE_URL` | `postgres://selim_mcp:비밀번호@localhost:5432/selim_mcp` | 운영 DB 주소 |
| `SESSION_SECRET` | 랜덤 값 | **운영용으로 새로 만든** 랜덤 값 |
| `OTP_PEPPER` | 랜덤 값 | **운영용으로 새로 만든** 랜덤 값 |
| `INITIAL_ADMIN_EMAILS` | 내 이메일 | 관리자 이메일 |
| `OTP_DEV_ACCEPT_ANY` | `true` | `false` (필수) |
| `NODE_ENV` | `development` | `production` |
| `FRONT_DIST` | `../front/dist` | `../front/dist` |
| `TRUST_PROXY` | `false` | nginx 뒤면 `true` |

그다음 DB 테이블을 만든다. 여러 번 실행해도 안전하다 (이미 적용된 DDL은 건너뜀).

```bash
npm run db:migrate
```

## 4. 로컬에서 개발 실행

터미널 2개를 쓴다.

```bash
# 터미널 1: 서버 (http://localhost:8080)
cd server && npm run dev:local   # PGlite 사용 시 (실제 PostgreSQL이면 npm run dev)

# 터미널 2: 화면 (http://localhost:5173) — /api, /mcp는 8080으로 자동 전달
cd front && npm install && npm run dev
```

- 사용자 화면: http://localhost:5173
- 관리자 화면: http://localhost:5173/admin → `INITIAL_ADMIN_EMAILS`에 넣은 이메일로 로그인
- `OTP_DEV_ACCEPT_ANY=true`면 인증번호는 아무 6자리나 통과한다. `false`로 두면 서버 로그에 찍힌 번호를 입력하면 된다:
  ```
  [mail] name@selim.kr 인증번호 482917 (3분 유효) — 실제 메일 발송은 미구현
  ```

### Claude Code로 연결 확인

사용자 화면에서 키를 발급받고, 화면에 나온 명령어를 그대로 실행한다.

```bash
claude mcp add --transport http selim http://localhost:5173/mcp \
  --header "Authorization: Bearer selim_mcp_..."
```

Claude Code에서 `/mcp`로 연결 상태를 보거나 "지금 몇 시야?"처럼 물어보면 `current_time` 도구가 호출된다. 호출 기록은 관리자 > 사용 로그에서 확인.

---

## 5. 운영 서버로 옮기기

> ⚠ **메일 발송을 연동하기 전에는 운영에 올리면 안 된다.** 운영에서는 `OTP_DEV_ACCEPT_ANY=false`가 강제라서, 메일이 안 가면 아무도 인증번호를 받을 수 없다. 아래 [메일 연동](#메일-연동) 먼저.

### 5-1. 빌드

```bash
cd front && npm ci && npm run build      # → front/dist
cd ../server && npm ci && npm run build  # → server/dist
npm run db:migrate
```

### 5-2. 실행 (systemd)

`/etc/systemd/system/selim-mcp.service`

```ini
[Unit]
Description=Selim MCP server
After=network.target postgresql.service

[Service]
WorkingDirectory=/opt/selim_MCP/server
ExecStart=/usr/bin/node --env-file=.env dist/index.js
Restart=always
User=selim-mcp

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now selim-mcp
journalctl -u selim-mcp -f   # 로그 보기
```

### 5-3. HTTPS (nginx)

API 키가 헤더로 오가므로 **반드시 HTTPS**로 연다.

```nginx
server {
    listen 443 ssl;
    server_name mcp.selim.kr;

    ssl_certificate     /etc/ssl/selim/fullchain.pem;
    ssl_certificate_key /etc/ssl/selim/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }
}
```

nginx 뒤에 두면 `.env`에 `TRUST_PROXY=true`.

### 5-4. 화면에 나오는 MCP 주소

사용자 화면의 연결 명령어에는 **지금 접속한 주소 + `/mcp`**가 들어간다 (예: `https://mcp.selim.kr/mcp`). 화면과 MCP를 다른 주소로 나눌 때만 프론트 빌드 시 지정한다.

```bash
VITE_MCP_URL=https://다른주소/mcp npm run build
```

### 5-5. 백업

```bash
# 매일 새벽 백업 (crontab -e)
0 3 * * * pg_dump -Fc "postgres://selim_mcp:비밀번호@localhost/selim_mcp" > /backup/selim_mcp_$(date +\%F).dump
```

복구: `pg_restore -d selim_mcp /backup/selim_mcp_날짜.dump`

### 이전 체크리스트

- [ ] PostgreSQL 준비, `npm run db:migrate` 완료
- [ ] `.env`: `NODE_ENV=production`, `OTP_DEV_ACCEPT_ANY=false`
- [ ] `.env`: `SESSION_SECRET`, `OTP_PEPPER`를 **운영용으로 새로** 생성 (로컬 값 재사용 금지)
- [ ] 메일 발송 연동 완료
- [ ] HTTPS 적용 (nginx 등), `TRUST_PROXY=true`
- [ ] `https://주소/api/health`가 `{"ok":true}` 응답
- [ ] 관리자 로그인 → 설정에서 허용 도메인, 관리자 목록 확인
- [ ] 키 발급 → Claude Code 연결 → 사용 로그에 기록되는지 확인
- [ ] DB 백업 예약

로컬 DB의 데이터를 그대로 옮기고 싶으면 `pg_dump`로 떠서 운영 DB에 `pg_restore`. 보통은 운영에서 새로 시작하는 게 깔끔하다 (테스트 키가 섞이지 않게).

---

## 메일 연동

메일 발송 정보(써팀 SMTP 또는 AWS SES)를 받으면 `server/src/lib/mailer.ts`만 바꾸면 된다. 나머지 인증 흐름은 이미 완성돼 있다.

SMTP 예시 (`npm install nodemailer`, `npm install -D @types/nodemailer`):

```ts
import nodemailer from 'nodemailer'

class SmtpMailer implements Mailer {
  private transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_PORT === '465',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })

  async sendOtp(email: string, code: string, ttlMinutes: number) {
    await this.transport.sendMail({
      from: process.env.MAIL_FROM, // 예: "Selim MCP <no-reply@selim.kr>"
      to: email,
      subject: `[Selim MCP] 인증번호 ${code}`,
      text: `인증번호: ${code}\n${ttlMinutes}분 안에 입력해 주세요.`,
      html: `...회사 로고, 브랜드 색을 넣은 HTML...`,
    })
  }
}

export const mailer: Mailer = process.env.SMTP_HOST ? new SmtpMailer() : new ConsoleMailer()
```

`.env`에 `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`을 추가하고 `.env.example`에도 항목을 적어 둔다.

---

## 자주 나는 오류

| 증상 | 원인·해결 |
|---|---|
| `환경변수 ...가 없거나 너무 짧아요` | `.env` 확인. 비밀값은 32자 이상 |
| `DB에 연결할 수 없어요` | `DATABASE_URL`, PostgreSQL 실행 여부, `npm run db:migrate` 실행 여부 |
| `relation "settings" does not exist` | 마이그레이션 안 함 → `npm run db:migrate` |
| 관리자 로그인 시 `관리자로 등록된 이메일이 아니에요` | `admins` 테이블 확인. 비어 있을 때만 `INITIAL_ADMIN_EMAILS`가 등록됨. 직접 추가: `INSERT INTO admins (email) VALUES ('name@selim.kr');` |
| 화면에서 `서버에 연결할 수 없어요` | 서버(8080)가 꺼져 있음. 개발 중이면 `server`에서 `npm run dev` |
| `/admin` 새로고침 시 404 | 서버 대신 다른 웹서버가 화면을 내려주는 경우 SPA 설정 필요 (모든 경로 → `index.html`) |
| Claude Code에서 도구가 안 보임 | 키 정지·만료 여부, 관리자/내 도구 설정 확인 후 Claude 재연결 |
