import LoginClient from "./LoginClient";

export const dynamic = "force-dynamic";

export default async function LoginPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const spAny: any = await props.searchParams;

  const nextRaw =
    typeof spAny?.next === "string"
      ? spAny.next
      : Array.isArray(spAny?.next)
        ? spAny.next[0]
        : "";

  // Avoid throwing on malformed encodings
  let next = "/portal";
  if (nextRaw) {
    try {
      next = decodeURIComponent(nextRaw);
    } catch {
      next = nextRaw;
    }
  }

  // Basic safety: keep internal redirects only
  if (!next.startsWith("/")) next = "/portal";

  return <LoginClient nextUrl={next} />;
}
