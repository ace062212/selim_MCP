import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage } from '../lib/api'

// 화면에 들어올 때 데이터를 불러오고, reload()로 다시 불러옴
export function useLoad<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)
  // 화면마다 load 함수가 매번 새로 만들어져도 다시 불러오지 않도록 ref로 보관
  const loadRef = useRef(load)
  useEffect(() => {
    loadRef.current = load
  })

  useEffect(() => {
    let alive = true
    loadRef.current().then(
      (d) => {
        if (!alive) return
        setData(d)
        setError('')
      },
      (err) => alive && setError(errorMessage(err)),
    )
    return () => {
      alive = false
    }
  }, [version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])
  return { data, error, reload, setData }
}
