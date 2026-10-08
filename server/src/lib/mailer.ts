// 인증번호 메일 발송
// TODO: 메일 발송 정보(써팀 SMTP 또는 AWS SES)를 받으면 실제 발송 구현으로 교체

export interface Mailer {
  sendOtp(email: string, code: string, ttlMinutes: number): Promise<void>
}

// 개발용: 메일 대신 서버 로그에 인증번호를 찍음
class ConsoleMailer implements Mailer {
  async sendOtp(email: string, code: string, ttlMinutes: number) {
    console.log(`[mail] ${email} 인증번호 ${code} (${ttlMinutes}분 유효) — 실제 메일 발송은 미구현`)
  }
}

export const mailer: Mailer = new ConsoleMailer()
