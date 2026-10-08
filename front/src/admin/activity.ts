import type { Activity } from '../lib/api'

export type Tone = 'navy' | 'sky' | 'amber' | 'rose' | 'slate'

// audit_logs 한 줄 → 대시보드 "최근 활동" 문장
export function describeActivity(a: Activity): { text: string; tone: Tone } {
  const who = a.actorEmail ?? '알 수 없음'
  const target = a.targetId ?? ''
  const byAdmin = a.actorType === 'admin'
  switch (a.action) {
    case 'key.issue':
      return byAdmin ? { text: `관리자가 ${target}님에게 키를 발급했어요`, tone: 'sky' } : { text: `${who}님이 API 키를 발급했어요`, tone: 'sky' }
    case 'key.reissue':
      return byAdmin ? { text: `관리자가 ${target}님의 키를 재발급했어요`, tone: 'navy' } : { text: `${who}님이 API 키를 재발급했어요`, tone: 'navy' }
    case 'key.suspend':
      return { text: `관리자가 ${target}님의 키를 정지했어요`, tone: 'rose' }
    case 'key.activate':
      return { text: `관리자가 ${target}님의 키를 다시 활성화했어요`, tone: 'sky' }
    case 'key.revoke':
      return { text: `관리자가 ${target}님의 키를 폐기했어요`, tone: 'rose' }
    case 'tool.register':
      return { text: `새 도구 ${target}가 등록됐어요. MCP 도구 화면에서 켜야 공개돼요`, tone: 'amber' }
    case 'tool.enable':
      return { text: `${target} 도구를 활성화했어요`, tone: 'sky' }
    case 'tool.disable':
      return { text: `${target} 도구를 비활성화했어요`, tone: 'slate' }
    case 'tool.describe':
      return { text: `${target} 도구 설명을 수정했어요`, tone: 'navy' }
    case 'user_tool.update':
      return { text: `${who}님이 ${target} 도구를 ${a.detail?.enabled ? '켰어요' : '껐어요'}`, tone: 'slate' }
    case 'settings.update':
      return { text: `${who} 관리자가 설정을 변경했어요`, tone: 'navy' }
    default:
      return { text: `${a.action} ${target}`.trim(), tone: 'slate' }
  }
}
