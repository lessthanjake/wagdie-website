import type { ApiResponse } from './responses';

function getApiErrorMessage<T>(body: ApiResponse<T> | undefined, fallbackMessage: string): string {
  const details = Array.isArray(body?.details) ? body.details.join('\n') : body?.details;
  return details || body?.error || fallbackMessage;
}

export async function readApiData<T>(response: Response, fallbackMessage: string): Promise<T> {
  const body = await response.json().catch(() => undefined) as ApiResponse<T> | undefined;

  if (!response.ok || body?.success !== true || body.data === undefined) {
    throw new Error(getApiErrorMessage(body, fallbackMessage));
  }

  return body.data;
}
