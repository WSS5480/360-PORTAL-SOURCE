import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// You can export either a named `proxy` or a default export.
// We'll do BOTH so Next definitely detects it. :contentReference[oaicite:1]{index=1}
export async function proxy(request: NextRequest) {
  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Keeps auth cookies/session fresh on navigation
  await supabase.auth.getUser();

  return response;
}

export default proxy;

export const config = {
  matcher: ["/admin/:path*", "/portal/:path*"],
};
