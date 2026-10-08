// API 키별 1분 호출 제한 (메모리). 서버를 여러 대로 늘리면 Redis로 옮겨야 함
const hits = new Map<number, number[]>()

export function allow(keyId: number, perMinute: number) {
  const now = Date.now()
  const recent = (hits.get(keyId) ?? []).filter((t) => now - t < 60_000)
  if (recent.length >= perMinute) {
    hits.set(keyId, recent)
    return false
  }
  recent.push(now)
  hits.set(keyId, recent)
  return true
}

// 오래된 기록 정리
setInterval(() => {
  const now = Date.now()
  for (const [id, list] of hits) if (list.every((t) => now - t >= 60_000)) hits.delete(id)
}, 60_000).unref()
