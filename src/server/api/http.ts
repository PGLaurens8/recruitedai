interface RequestTelemetryContext {
  method: string;
  path: string;
  userAgent: string | null;
  ip: string | null;
}

const requestTelemetryById = new Map<string, RequestTelemetryContext>();

function extractRequestContext(request: Request): RequestTelemetryContext {
  const url = new URL(request.url);
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip");

  return {
    method: request.method,
    path: url.pathname,
    userAgent: request.headers.get("user-agent"),
    ip,
  };
}

function takeRequestContext(requestId: string) {
  const ctx = requestTelemetryById.get(requestId) || null;
  requestTelemetryById.delete(requestId);
  return ctx;
}

function writeStructuredLog(level: "warn" | "error", payload: Record<string, unknown>) {
  const serialized = JSON.stringify(payload);
  if (level === "error") {
    console.error(serialized);
    return;
  }
  console.warn(serialized);
}

export class ApiRouteError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function getRequestId(request: Request) {
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
  requestTelemetryById.set(requestId, extractRequestContext(request));
  return requestId;
}

export function jsonSuccess(requestId: string, data: unknown, status = 200) {
  takeRequestContext(requestId);
  return Response.json(
    {
      ok: true,
      requestId,
      data,
    },
    {
      status,
      headers: {
        "x-request-id": requestId,
      },
    }
  );
}

export function jsonError(requestId: string, error: unknown) {
  const ctx = takeRequestContext(requestId);

  if (error instanceof ApiRouteError) {
    const level = error.status >= 500 ? "error" : "warn";
    writeStructuredLog(level, {
      timestamp: new Date().toISOString(),
      level,
      event: "api_error",
      requestId,
      status: error.status,
      code: error.code,
      message: error.message,
      details: error.details,
      method: ctx?.method,
      path: ctx?.path,
      userAgent: ctx?.userAgent,
      ip: ctx?.ip,
    });

    return Response.json(
      {
        ok: false,
        requestId,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      {
        status: error.status,
        headers: {
          "x-request-id": requestId,
        },
      }
    );
  }

  const unexpected = error instanceof Error
    ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      }
    : {
        value: String(error),
      };

  writeStructuredLog("error", {
    timestamp: new Date().toISOString(),
    level: "error",
    event: "api_unexpected_error",
    requestId,
    status: 500,
    code: "INTERNAL_ERROR",
    error: unexpected,
    method: ctx?.method,
    path: ctx?.path,
    userAgent: ctx?.userAgent,
    ip: ctx?.ip,
  });

  return Response.json(
    {
      ok: false,
      requestId,
      error: {
        code: "INTERNAL_ERROR",
        message: "Unexpected server error.",
      },
    },
    {
      status: 500,
      headers: {
        "x-request-id": requestId,
      },
    }
  );
}
