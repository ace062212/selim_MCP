-- =====================================================================
-- Selim MCP 초기 스키마 (PostgreSQL 14+)
-- 설계 설명: doc/02-database.md
-- =====================================================================

BEGIN;

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------
-- 사용자: 이메일 인증을 한 번이라도 통과하면 생성
-- ---------------------------------------------------------------------
CREATE TABLE users (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email       varchar(320) NOT NULL,
  name        varchar(50),
  dept        varchar(100),
  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT uq_users_email UNIQUE (email),
  CONSTRAINT ck_users_email_lower CHECK (email = lower(email))
);
COMMENT ON TABLE  users       IS '사용자 (회사 이메일 기준)';
COMMENT ON COLUMN users.email IS '소문자로 정규화해서 저장';

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ---------------------------------------------------------------------
-- 관리자: 이 목록의 이메일만 관리자 페이지 로그인 가능
-- ---------------------------------------------------------------------
CREATE TABLE admins (
  email       varchar(320) PRIMARY KEY,
  created_at  timestamptz  NOT NULL DEFAULT now(),
  created_by  varchar(320),
  CONSTRAINT ck_admins_email_lower CHECK (email = lower(email))
);
COMMENT ON TABLE admins IS '관리자 이메일 목록';


-- ---------------------------------------------------------------------
-- API 키: 사용자당 살아있는(active/suspended) 키는 1개
--   재발급 = 기존 키 revoked 처리 + 새 행 추가 (이력 보존)
-- ---------------------------------------------------------------------
CREATE TABLE api_keys (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       bigint       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  key_hash      char(64)     NOT NULL,
  key_prefix    varchar(20)  NOT NULL,
  key_last4     char(4)      NOT NULL,
  status        varchar(20)  NOT NULL DEFAULT 'active',
  issued_by     varchar(10)  NOT NULL DEFAULT 'self',
  issued_at     timestamptz  NOT NULL DEFAULT now(),
  expires_at    timestamptz,
  last_used_at  timestamptz,
  revoked_at    timestamptz,
  CONSTRAINT uq_api_keys_hash UNIQUE (key_hash),
  CONSTRAINT ck_api_keys_status CHECK (status IN ('active', 'suspended', 'revoked')),
  CONSTRAINT ck_api_keys_issued_by CHECK (issued_by IN ('self', 'admin')),
  CONSTRAINT ck_api_keys_revoked CHECK ((status = 'revoked') = (revoked_at IS NOT NULL))
);
COMMENT ON TABLE  api_keys            IS 'MCP 접속용 API 키. 원문은 저장하지 않음 (발급 시 한 번만 보여줌)';
COMMENT ON COLUMN api_keys.key_hash   IS 'SHA-256(hex). MCP 요청 인증 시 이 값으로 조회';
COMMENT ON COLUMN api_keys.key_prefix IS '화면 표시용 앞부분 (예: selim_mcp_ab12)';
COMMENT ON COLUMN api_keys.key_last4  IS '화면 표시용 끝 4자리';
COMMENT ON COLUMN api_keys.expires_at IS 'NULL이면 무기한';

CREATE UNIQUE INDEX uq_api_keys_live_per_user ON api_keys (user_id) WHERE status <> 'revoked';
CREATE INDEX ix_api_keys_status ON api_keys (status);


-- ---------------------------------------------------------------------
-- 이메일 인증번호: 키 발급 / 조회 / 도구 설정 / 관리자 로그인 공용
-- ---------------------------------------------------------------------
CREATE TABLE email_otps (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email        varchar(320) NOT NULL,
  purpose      varchar(20)  NOT NULL,
  code_hash    char(64)     NOT NULL,
  attempts     smallint     NOT NULL DEFAULT 0,
  expires_at   timestamptz  NOT NULL,
  consumed_at  timestamptz,
  request_ip   inet,
  created_at   timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT ck_email_otps_purpose CHECK (purpose IN ('issue', 'lookup', 'settings', 'admin')),
  CONSTRAINT ck_email_otps_email_lower CHECK (email = lower(email))
);
COMMENT ON TABLE  email_otps           IS '이메일 인증번호 (발송 이력 겸용)';
COMMENT ON COLUMN email_otps.code_hash IS 'HMAC-SHA256(서버 비밀값, 6자리 번호)';
COMMENT ON COLUMN email_otps.attempts  IS '틀린 횟수. 5회 이상이면 무효';

CREATE INDEX ix_email_otps_email_created ON email_otps (email, created_at DESC);


-- ---------------------------------------------------------------------
-- MCP 도구: 코드에 정의된 도구를 서버 시작 시 동기화 (name 기준 upsert)
-- ---------------------------------------------------------------------
CREATE TABLE tools (
  id                    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name                  varchar(100) NOT NULL,
  description           text         NOT NULL,
  description_override  text,
  category              varchar(50),
  enabled               boolean      NOT NULL DEFAULT true,
  sort_order            integer      NOT NULL DEFAULT 0,
  retired_at            timestamptz,
  created_at            timestamptz  NOT NULL DEFAULT now(),
  updated_at            timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT uq_tools_name UNIQUE (name)
);
COMMENT ON TABLE  tools                      IS 'MCP 도구 (관리자 전체 설정)';
COMMENT ON COLUMN tools.description          IS '코드에 정의된 기본 설명 (동기화 시 갱신)';
COMMENT ON COLUMN tools.description_override IS '관리자가 고친 설명. 있으면 이 값을 클라이언트에 보냄';
COMMENT ON COLUMN tools.enabled              IS '관리자 켜기/끄기. 사용자 설정보다 우선';
COMMENT ON COLUMN tools.retired_at           IS '코드에서 빠진 도구. 기록 보존을 위해 삭제하지 않음';

CREATE TRIGGER trg_tools_updated_at BEFORE UPDATE ON tools
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ---------------------------------------------------------------------
-- 사용자별 도구 설정: 사용자가 바꾼 것만 저장 (행이 없으면 켜짐)
-- ---------------------------------------------------------------------
CREATE TABLE user_tools (
  user_id     bigint      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  tool_id     bigint      NOT NULL REFERENCES tools (id) ON DELETE CASCADE,
  enabled     boolean     NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tool_id)
);
COMMENT ON TABLE user_tools IS '사용자 개인 도구 켜기/끄기 (기본값 켜짐이라 바꾼 것만 저장)';

CREATE TRIGGER trg_user_tools_updated_at BEFORE UPDATE ON user_tools
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- 실제 사용 가능 여부 = 관리자가 켬 AND 사용자가 끄지 않음
CREATE VIEW v_user_tools AS
SELECT
  u.id                                      AS user_id,
  t.id                                      AS tool_id,
  t.name                                    AS tool_name,
  COALESCE(t.description_override, t.description) AS description,
  t.enabled                                 AS admin_enabled,
  COALESCE(ut.enabled, true)                AS user_enabled,
  t.enabled AND COALESCE(ut.enabled, true)  AS effective_enabled
FROM users u
CROSS JOIN tools t
LEFT JOIN user_tools ut ON ut.user_id = u.id AND ut.tool_id = t.id
WHERE t.retired_at IS NULL;
COMMENT ON VIEW v_user_tools IS '사용자별 최종 도구 사용 가능 여부';


-- ---------------------------------------------------------------------
-- 전역 설정 (key-value)
-- ---------------------------------------------------------------------
CREATE TABLE settings (
  key         varchar(50)  PRIMARY KEY,
  value       jsonb        NOT NULL,
  updated_at  timestamptz  NOT NULL DEFAULT now(),
  updated_by  varchar(320)
);
COMMENT ON TABLE settings IS '전역 설정. 기본값은 sql/seed/001_default_settings.sql';

CREATE TRIGGER trg_settings_updated_at BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ---------------------------------------------------------------------
-- MCP 도구 호출 기록: 대시보드, 사용 로그 화면의 원천 데이터
-- ---------------------------------------------------------------------
CREATE TABLE call_logs (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  called_at    timestamptz  NOT NULL DEFAULT now(),
  user_id      bigint       REFERENCES users (id) ON DELETE SET NULL,
  api_key_id   bigint       REFERENCES api_keys (id) ON DELETE SET NULL,
  tool_name    varchar(100) NOT NULL,
  client       varchar(50),
  status       smallint     NOT NULL,
  latency_ms   integer,
  error_message text
);
COMMENT ON TABLE  call_logs           IS 'MCP 도구 호출 기록';
COMMENT ON COLUMN call_logs.tool_name IS '도구가 삭제돼도 기록이 남도록 이름으로 저장';
COMMENT ON COLUMN call_logs.client    IS 'Claude Code / Claude Desktop / Cursor 등 (MCP initialize의 clientInfo)';
COMMENT ON COLUMN call_logs.status    IS 'HTTP 상태 코드 기준 (200, 401, 403, 429, 500)';

CREATE INDEX ix_call_logs_called_at      ON call_logs (called_at DESC);
CREATE INDEX ix_call_logs_user_called_at ON call_logs (user_id, called_at DESC);
CREATE INDEX ix_call_logs_tool_called_at ON call_logs (tool_name, called_at DESC);


-- ---------------------------------------------------------------------
-- 활동 기록: 관리자 작업, 사용자 설정 변경 등 (대시보드 "최근 활동")
-- ---------------------------------------------------------------------
CREATE TABLE audit_logs (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  occurred_at  timestamptz  NOT NULL DEFAULT now(),
  actor_type   varchar(10)  NOT NULL,
  actor_email  varchar(320),
  action       varchar(50)  NOT NULL,
  target_type  varchar(20),
  target_id    varchar(100),
  detail       jsonb,
  CONSTRAINT ck_audit_logs_actor_type CHECK (actor_type IN ('admin', 'user', 'system'))
);
COMMENT ON TABLE  audit_logs        IS '활동 기록';
COMMENT ON COLUMN audit_logs.action IS '예: key.issue, key.reissue, key.suspend, key.revoke, tool.enable, tool.disable, user_tool.update, settings.update';

CREATE INDEX ix_audit_logs_occurred_at ON audit_logs (occurred_at DESC);

COMMIT;
