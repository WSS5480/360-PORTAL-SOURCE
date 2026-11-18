/** Parse fetch JSON safely — avoids opaque "Unexpected end of JSON input" errors. */
export async function readFetchJson<T>(res: Response, fallbackError: string): Promise<T> {
  const text = await res.text();
  if (!text.trim()) {
    throw new Error(res.ok ? "Empty response from server." : `${fallbackError} (${res.status})`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`${fallbackError} (invalid server response, ${res.status}).`);
  }
}
