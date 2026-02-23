export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  source: string;
  requestId?: string;
  duration?: number;
  method?: string;
  path?: string;
  statusCode?: number;
  [key: string]: any;
}

class Logger {
  private level: LogLevel;

  constructor() {
    this.level = process.env.LOG_LEVEL
      ? LogLevel[process.env.LOG_LEVEL as keyof typeof LogLevel] ?? LogLevel.INFO
      : LogLevel.INFO;
  }

  private formatEntry(entry: LogEntry): string {
    if (process.env.NODE_ENV === 'production') {
      return JSON.stringify(entry);
    }
    const time = new Date(entry.timestamp).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    let line = `${time} [${entry.source}]`;
    if (entry.requestId) line += ` [${entry.requestId.slice(0, 8)}]`;
    line += ` ${entry.message}`;
    if (entry.duration !== undefined) line += ` (${entry.duration}ms)`;
    return line;
  }

  private log(level: LogLevel, message: string, meta: Partial<LogEntry> = {}) {
    if (level < this.level) return;
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message,
      source: meta.source || 'app',
      ...meta,
    };
    const formatted = this.formatEntry(entry);
    if (level >= LogLevel.ERROR) {
      console.error(formatted);
    } else if (level >= LogLevel.WARN) {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
  }

  debug(message: string, meta?: Partial<LogEntry>) { this.log(LogLevel.DEBUG, message, meta); }
  info(message: string, meta?: Partial<LogEntry>) { this.log(LogLevel.INFO, message, meta); }
  warn(message: string, meta?: Partial<LogEntry>) { this.log(LogLevel.WARN, message, meta); }
  error(message: string, meta?: Partial<LogEntry>) { this.log(LogLevel.ERROR, message, meta); }

  request(method: string, path: string, statusCode: number, duration: number, requestId?: string) {
    this.info(`${method} ${path} ${statusCode}`, {
      source: 'http', method, path, statusCode, duration, requestId
    });
  }
}

export const logger = new Logger();
