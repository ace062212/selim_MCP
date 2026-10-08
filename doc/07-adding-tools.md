# 07. MCP 도구 추가하는 법

도구는 코드가 원본이다. 파일 하나 만들고 목록에 넣은 뒤 서버를 다시 시작하면, DB `tools` 테이블에 자동 등록되고 관리자 화면에 나타난다. 규칙은 [04-tool-policy.md](04-tool-policy.md).

## 1. 파일 만들기

`server/src/mcp/tools/` 아래에 파일을 만든다. 예: 나라장터 입찰공고 검색

```ts
// server/src/mcp/tools/g2bBidSearch.ts
import { z } from 'zod'
import { defineTool, text } from './types.js'

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

  // 실제 동작. ctx에 호출한 사용자 정보(userId, email)가 들어 있음
  async handler({ keyword, days }, ctx) {
    const items = await searchBids(keyword, days) // 외부 API 호출 등
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

시작할 때 `tools` 테이블과 맞춰진다.
- 새 도구: 추가 (관리자 켜짐, 사용자 기본 켜짐)
- 이름·설명·분류 변경: 반영 (관리자가 고친 설명이 있으면 그게 우선)
- 목록에서 뺀 도구: `retired_at` 기록, 화면과 MCP에서 사라짐 (호출 기록은 남음)

## 작성 팁

- **오류는 던져도 된다.** 서버가 잡아서 사용자에게 "도구 실행 중 오류" 메시지로 돌려주고, 사용 로그에 500으로 남긴다.
- **비밀값(외부 API 키 등)은 코드에 쓰지 말고** `.env`에 넣고 `process.env.XXX`로 읽는다. `.env.example`에도 항목을 추가해 둔다.
- **사용자별로 결과가 달라야 하면** `ctx.email`, `ctx.userId`를 쓴다 (예: `my_usage`).
- **응답은 짧고 정리된 텍스트로.** Claude가 그대로 읽으므로 필요한 정보만, 목록은 줄바꿈으로.
- 오래 걸리는 작업은 피한다. 클라이언트가 기다리다 끊을 수 있다 (수십 초 이내 권장).

## 지금 있는 도구 (예시)

| 이름 | 분류 | 내용 |
|---|---|---|
| `current_time` | 유틸 | 한국 시간 날짜·요일. "오늘", "이번 주" 해석용 |
| `whoami` | 계정 | 연결된 계정, 키 정보, 사용 가능한 도구 |
| `my_usage` | 계정 | 내 최근 호출 수 (도구별) |

실제 업무 도구(사내 문서 검색, 나라장터 조회 등)는 연결할 시스템이 정해지면 같은 방식으로 추가한다.
