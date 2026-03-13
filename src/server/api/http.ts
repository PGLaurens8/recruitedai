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
  return request.headers.get('x-request-id') || crypto.randomUUID();
}

export function jsonSuccess(requestId: string, data: unknown, status = 200) {
  return Response.json(
    {
      ok: true,
      requestId,
      data,
    },
    {
      status,
      headers: {
        'x-request-id': requestId,
      },
    }
  );
}

export function jsonError(requestId: string, error: unknown) {
  if (error instanceof ApiRouteError) {
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
          'x-request-id': requestId,
        },
      }
    );
  }

  return Response.json(
    {
      ok: false,
      requestId,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Unexpected server error.',
      },
    },
    {
      status: 500,
      headers: {
        'x-request-id': requestId,
      },
    }
  );
}

