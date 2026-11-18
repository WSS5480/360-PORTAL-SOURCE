import ResetPasswordClient from "./ResetPasswordClient";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = props.searchParams ? await props.searchParams : {};

  const nextRaw = typeof sp.next === "string" ? sp.next : Array.isArray(sp.next) ? sp.next[0] : "";

  let nextUrl = "/portal";
  if (nextRaw) {
    try {
      nextUrl = decodeURIComponent(nextRaw);
    } catch {
      nextUrl = nextRaw;
    }
  }
  if (!nextUrl.startsWith("/")) nextUrl = "/portal";

  return <ResetPasswordClient nextUrl={nextUrl} />;
}
