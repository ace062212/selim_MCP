-- 전역 설정 기본값 (이미 있으면 건드리지 않음)
-- 관리자 화면 "설정" 메뉴와 1:1 대응

INSERT INTO settings (key, value) VALUES
  ('allowed_domains',      '["selim.kr"]'),  -- 인증번호를 받을 수 있는 이메일 도메인
  ('self_issue',           'true'),          -- 사용자 자체 발급 허용
  ('key_ttl_days',         'null'),          -- 키 유효 기간(일). null = 무기한
  ('rate_limit_per_min',   '60'),            -- 사용자별 분당 요청 제한
  ('otp_ttl_minutes',      '3'),             -- 인증번호 유효 시간
  ('otp_max_attempts',     '5'),             -- 인증번호 최대 시도 횟수
  ('session_ttl_minutes',  '30'),            -- 인증 후 로그인 유지 시간
  ('log_retention_days',   '365')            -- 호출 기록 보관 기간
ON CONFLICT (key) DO NOTHING;

-- 최초 관리자 (실제 관리자 이메일로 바꿔서 실행)
INSERT INTO admins (email, created_by) VALUES
  ('admin@selim.kr', 'seed')
ON CONFLICT (email) DO NOTHING;
