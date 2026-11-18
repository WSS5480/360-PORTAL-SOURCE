import SignupClient from "./SignupClient";

export const dynamic = "force-dynamic";

export default async function SignupPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const spAny: any = await props.searchParams;

  const nextRaw =
    typeof spAny?.next === "string"
      ? spAny.next
      : Array.isArray(spAny?.next)
        ? spAny.next[0]
        : "";

  let nextUrl = "/portal";
  if (nextRaw) {
    try {
      nextUrl = decodeURIComponent(nextRaw);
    } catch {
      nextUrl = nextRaw;
    }
  }
  if (!nextUrl.startsWith("/")) nextUrl = "/portal";

  return <SignupClient nextUrl={nextUrl} />;
}
