type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  scope: string;
  [key: string]: unknown;
}

function emit(entry: LogEntry): void {
  const { level, ...rest } = entry;
  const line = JSON.stringify({ ts: new Date().toISOString(), level, ...rest });
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export function createLogger(scope: string) {
  return {
    info(message: string, data?: Record<string, unknown>) {
      emit({ level: "info", scope, message, ...data });
    },
    warn(message: string, data?: Record<string, unknown>) {
      emit({ level: "warn", scope, message, ...data });
    },
    error(message: string, error?: unknown, data?: Record<string, unknown>) {
      const errorInfo =
        error instanceof Error
          ? { errorMessage: error.message, stack: error.stack }
          : { errorMessage: String(error) };
      emit({ level: "error", scope, message, ...errorInfo, ...data });
    },
  };
}
