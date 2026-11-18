export async function readResponseJson<T = Record<string, unknown>>(res: Response): Promise<T> {
  const raw = await res.text();
  if (!raw.trim()) {
    throw new Error(
      res.status ? `Server returned an empty response (HTTP ${res.status}).` : "Server returned an empty response."
    );
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    const preview = raw.trim().slice(0, 80).replace(/\s+/g, " ");
    throw new Error(
      res.status
        ? `Server returned invalid JSON (HTTP ${res.status}${preview ? `: ${preview}` : ""}).`
        : `Server returned invalid JSON${preview ? `: ${preview}` : ""}.`
    );
  }
}
