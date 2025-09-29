'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface UseAsyncResourceOptions<T> {
  fetcher: () => Promise<T>
  deps?: any[]
  auto?: boolean
  retry?: { attempts: number; delayMs: number }
}

export function useAsyncResource<T>({ fetcher, deps = [], auto = true, retry }: UseAsyncResourceOptions<T>) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState<boolean>(auto)
  const [error, setError] = useState<Error | null>(null)
  const [attempt, setAttempt] = useState(0)
  const isMounted = useRef(true)

  useEffect(() => {
    return () => { isMounted.current = false }
  }, [])

  const run = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetcher()
      if (isMounted.current) setData(result)
    } catch (e: any) {
      if (isMounted.current) setError(e)
      if (retry && attempt < retry.attempts) {
        setTimeout(() => setAttempt(a => a + 1), retry.delayMs)
      }
    } finally {
      if (isMounted.current) setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher, attempt])

  useEffect(() => {
    if (!auto) return
    setAttempt(0)
    run()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  const retryNow = useCallback(() => {
    setAttempt(0)
    run()
  }, [run])

  return { data, setData, loading, error, reload: run, retry: retryNow }
}


