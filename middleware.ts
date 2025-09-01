// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req: NextRequest) {
  const { pathname, hostname, search } = req.nextUrl;

  // 1) IGNORAR API, assets e estáticos sempre
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.match(/\.[a-zA-Z0-9]+$/)
  ) {
    return NextResponse.next();
  }

  // 2) Forçar www SOMENTE para páginas (não-API)
  if (hostname === "chopphub.com") {
    return NextResponse.redirect(
      new URL(`https://www.chopphub.com${pathname}${search}`),
      308,
    );
  }

  // 3) Gate de auth só para áreas protegidas
  if (pathname.startsWith("/dashboard")) {
    const res = NextResponse.next();
    const supabase = createMiddlewareClient({ req, res });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/login-signin", req.url));
    }

    // rotas admin
    if (
      pathname.startsWith("/dashboard/team") ||
      pathname.startsWith("/api/users/add-member")
    ) {
      const { data: cu } = await supabase
        .from("company_users")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cu?.role !== "admin") {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
    }
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/users/add-member"],
};
