interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
}

async function parseEnvelope<T>(response: Response): Promise<T> {
  let body: ApiEnvelope<T> | null = null;
  try {
    body = (await response.json()) as ApiEnvelope<T>;
  } catch {
    body = null;
  }

  if (response.ok === false || body?.ok !== true) {
    throw new Error(body?.error?.message || `Request failed: ${response.status}`);
  }

  return body.data as T;
}

export async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    method: 'GET',
  });
  return parseEnvelope<T>(response);
}

export async function postJson<T>(url: string, payload: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return parseEnvelope<T>(response);
}
