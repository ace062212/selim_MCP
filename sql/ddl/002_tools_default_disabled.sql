-- 새 도구는 관리자가 확인하고 켜야 공개되도록 기본값을 꺼짐으로 (doc/04-tool-policy.md)
-- 이미 등록된 도구의 켜기/끄기 상태는 바꾸지 않음

BEGIN;

ALTER TABLE tools ALTER COLUMN enabled SET DEFAULT false;
COMMENT ON COLUMN tools.enabled IS '관리자 켜기/끄기. 사용자 설정보다 우선. 새 도구는 꺼짐으로 등록됨';

COMMIT;
