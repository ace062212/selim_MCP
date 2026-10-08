# 07. MCP 도구 추가하는 법

도구는 코드가 원본이다. 파일 하나 만들고 목록에 넣은 뒤 서버를 다시 시작하면, DB `tools` 테이블에 자동 등록되고 관리자 화면에 나타난다. 규칙은 [04-tool-policy.md](04-tool-policy.md).

> **새 도구는 꺼진 상태로 등록된다.** 배포 후 관리자 > MCP 도구에서 확인하고 켜야 사용자에게 보인다. 미완성 도구가 실수로 공개되지 않게 하기 위함.

## 1. 파일 만들기

`server/src/mcp/tools/` 아래에 파일을 만든다. 예: 나라장터 입찰공고 검색

```ts
// server/src/mcp/tools/g2bBidSearch.ts
import { z } from 'zod'
import { ToolError, defineTool, text } from './types.js'

export default defineTool({
  // Claude가 부르는 이름. 영문 소문자 + 밑줄, 한 번 정하면 바꾸지 않기 (기록이 이름으로 남음)
  name: 'g2b_bid_search',

  // Claude가 이 설명을 읽고 언제 쓸지 정함. "무엇을 하는지 + 언제 쓰는지"를 구체적으로
  description: '나라장터 입찰공고를 키워드와 기간으로 검색해요. 공공 입찰, 발주 공고를 찾을 때 사용해요.',

  // 관리자·사용자 화면에 보이는 분류
  category: '공공데이터',

  // 입력값 형식. .describe()는 Claude가 값을 채울 때 참고함
  inputSchema: {
    keyword: z.string().min(1).describe('검색어 (예: 클라우드)'),
    days: z.number().int().min(1).max(90).default(7).describe('최근 며칠 공고'),
  },

  // 실행 제한 시간 (생략하면 30초). 넘으면 중단되고 사용 로그에 504로 남음
  timeoutMs: 20_000,

  // 실제 동작. ctx: 호출한 사용자(userId, email), 제한 시간 신호(signal)
  async handler({ keyword, days }, ctx) {
    if (keyword.length < 2) throw new ToolError('검색어를 2글자 이상 입력해 주세요.') // 사용자에게 그대로 보여줄 오류
    const items = await searchBids(keyword, days, { signal: ctx.signal }) // 제한 시간이 지나면 같이 멈춤
    if (!items.length) return text('조건에 맞는 공고가 없어요.')
    return text(items.map((i) => `- ${i.title} (${i.agency}, 마감 ${i.deadline})`).join('\n'))
  },
})
```

## 2. 목록에 추가

```ts
// server/src/mcp/tools/index.ts
import g2bBidSearch from './g2bBidSearch.js'

export const TOOLS: ToolDef[] = [currentTime, whoami, myUsage, g2bBidSearch]
```

배열 순서가 관리자·사용자 화면에 보이는 순서다.

## 3. 서버 재시작

```
npm run dev          # 개발: 파일 저장하면 자동 재시작
systemctl restart selim-mcp   # 운영
```

시작할 때 도구 정의를 먼저 검사한다. 이름 중복, 이름 형식(영문 소문자·숫자·밑줄), 빈 설명·분류가 있으면 **서버가 시작하지 않고** 무엇이 문제인지 알려준다.

그다음 `tools` 테이블과 맞춰진다.
- 새 도구: **관리자 꺼짐**으로 추가 → 관리자 > MCP 도구에서 켜야 공개 (켜면 사용자는 기본 켜짐)
- 이름·설명·분류 변경: 반영 (관리자가 고친 설명이 있으면 그게 우선)
- 목록에서 뺀 도구: `retired_at` 기록, 화면과 MCP에서 사라짐 (호출 기록은 남음)

## 작성 팁

- **오류 처리**
  - 사용자에게 보여줄 문장은 `throw new ToolError('...')` → 그대로 전달, 사용 로그에 400.
  - 그 밖의 오류(DB 오류, 외부 API 실패 등)는 그냥 던져도 된다 → 사용자에게는 일반 안내 문구만 가고, 원래 내용은 사용 로그와 서버 로그에만 남는다 (내부 정보 노출 방지). 사용 로그에 500.
- **제한 시간**: 기본 30초, `timeoutMs`로 바꿀 수 있다(최대 300초). 외부 호출에 `ctx.signal`을 넘기면 시간 초과 시 같이 멈춘다.
- **비밀값(외부 API 키 등)은 코드에 쓰지 말고** `.env`에 넣고 `process.env.XXX`로 읽는다. `.env.example`에도 항목을 추가해 둔다.
- **사용자별로 결과가 달라야 하면** `ctx.email`, `ctx.userId`를 쓴다 (예: `my_usage`).
- **응답은 짧고 정리된 텍스트로.** Claude가 그대로 읽으므로 필요한 정보만, 목록은 줄바꿈으로.

## 지금 있는 도구 (예시)

| 이름 | 분류 | 내용 |
|---|---|---|
| `current_time` | 유틸 | 한국 시간 날짜·요일. "오늘", "이번 주" 해석용 |
| `whoami` | 계정 | 연결된 계정, 키 정보, 사용 가능한 도구 |
| `my_usage` | 계정 | 내 최근 호출 수 (도구별) |

실제 업무 도구(사내 문서 검색, 나라장터 조회 등)는 연결할 시스템이 정해지면 같은 방식으로 추가한다.
