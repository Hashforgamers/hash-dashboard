// services/api/cacheService.ts
class CacheService {
  private cache = new Map<string, { data: any; timestamp: number }>()
  private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, { data, timestamp: Date.now() + ttl })
  }

  get<T>(key: string): T | null {
    const cached = this.cache.get(key)
    
    if (!cached) return null
    
    if (Date.now() > cached.timestamp) {
      this.cache.delete(key)
      return null
    }
    
    return cached.data as T
  }

  clear(key?: string): void {
    if (key) {
      this.cache.delete(key)
    } else {
      this.cache.clear()
    }
  }

  clearExpired(): void {
    const now = Date.now()
    Array.from(this.cache.entries()).forEach(([key, value]) => {
      if (now > value.timestamp) {
        this.cache.delete(key)
      }
    })
  }
}

export const cacheService = new CacheService()
