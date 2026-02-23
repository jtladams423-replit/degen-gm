interface RequestMetric {
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  timestamp: number;
}

class MetricsCollector {
  private requests: RequestMetric[] = [];
  private maxHistory = 10000;
  private startTime = Date.now();

  record(metric: RequestMetric) {
    this.requests.push(metric);
    if (this.requests.length > this.maxHistory) {
      this.requests = this.requests.slice(-this.maxHistory);
    }
  }

  getStats(windowMs = 60000) {
    const now = Date.now();
    const recent = this.requests.filter(r => now - r.timestamp < windowMs);
    const total = recent.length;
    if (total === 0) return { totalRequests: 0, avgDuration: 0, errorRate: 0, uptime: this.getUptime(), p95: 0, pathStats: {} };

    const durations = recent.map(r => r.duration).sort((a, b) => a - b);
    const errors = recent.filter(r => r.statusCode >= 400).length;
    const p95Index = Math.floor(durations.length * 0.95);

    const pathStats: Record<string, { count: number; avgMs: number; errors: number }> = {};
    for (const r of recent) {
      const normalized = r.path.replace(/\/\d+/g, '/:id');
      if (!pathStats[normalized]) pathStats[normalized] = { count: 0, avgMs: 0, errors: 0 };
      pathStats[normalized].count++;
      pathStats[normalized].avgMs += r.duration;
      if (r.statusCode >= 400) pathStats[normalized].errors++;
    }
    for (const key of Object.keys(pathStats)) {
      pathStats[key].avgMs = Math.round(pathStats[key].avgMs / pathStats[key].count);
    }

    return {
      totalRequests: total,
      avgDuration: Math.round(durations.reduce((a, b) => a + b, 0) / total),
      p95: durations[p95Index] || 0,
      errorRate: Math.round((errors / total) * 100) / 100,
      uptime: this.getUptime(),
      memory: process.memoryUsage(),
      pathStats,
    };
  }

  private getUptime() {
    const ms = Date.now() - this.startTime;
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  }
}

export const metrics = new MetricsCollector();
