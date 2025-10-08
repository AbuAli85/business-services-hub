const pendingRequests = new Map<string, Promise<any>>()

export async function cachedRequest<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 5000 // 5 second cache
): Promise<T> {
  // Check if request is pending
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)!
  }

  // Create new request
  const promise = fetcher().finally(() => {
    setTimeout(() => {
      pendingRequests.delete(key)
    }, ttl)
  })

  pendingRequests.set(key, promise)
  return promise
}

// Clear all pending requests (useful for cleanup)
export function clearRequestCache() {
  pendingRequests.clear()
}
