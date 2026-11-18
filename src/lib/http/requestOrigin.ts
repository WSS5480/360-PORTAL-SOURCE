const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function hostnameOf(host: string): string {
  const trimmed = host.trim().toLowerCase();
  if (trimmed.startsWith("[")) {
    const end = trimmed.indexOf("]");
    return end > 0 ? trimmed.slice(1, end) : trimmed;
  }
  return trimmed.split(":")[0] ?? trimmed;
}

export function isLoopbackHost(host: string): boolean {
  return LOOPBACK_HOSTS.has(hostnameOf(host));
}

/**
 * Resolve a redirect on the host the browser actually used.
 * Next can report req.url as localhost while the browser and its cookies are on 127.0.0.1.
 * Only loopback aliases are rewritten, so a client-supplied Host cannot redirect elsewhere.
 */
export function urlFromRequest(req: Request, path: string): URL {
  const base = new URL(req.url);
  const hostHeader = req.headers.get("host")?.trim() ?? "";
  if (hostHeader && isLoopbackHost(base.hostname) && isLoopbackHost(hostHeader) && hostHeader.toLowerCase() !== base.host.toLowerCase()) {
    return new URL(path, `${base.protocol}//${hostHeader}`);
  }
  return new URL(path, base);
}
