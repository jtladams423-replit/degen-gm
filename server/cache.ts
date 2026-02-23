interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  etag: string;
}

class ResponseCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTtl = 60000;
  private maxEntries = 500;

  set<T>(key: string, data: T, ttlMs = this.defaultTtl): void {
    if (this.cache.size >= this.maxEntries) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
      etag: this.generateEtag(data),
    });
  }

  get<T>(key: string): { data: T; etag: string } | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return { data: entry.data, etag: entry.etag };
  }

  invalidate(pattern: string): number {
    let count = 0;
    for (const key of Array.from(this.cache.keys())) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  clear(): void {
    this.cache.clear();
  }

  stats() {
    return { entries: this.cache.size, maxEntries: this.maxEntries };
  }

  private generateEtag(data: any): string {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return `"${Math.abs(hash).toString(36)}"`;
  }
}

export const responseCache = new ResponseCache();
