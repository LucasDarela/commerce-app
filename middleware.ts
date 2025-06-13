// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login-signin", req.url));
  }

  const userId = user.id;

  const isRestrictedAdminRoute =
    req.nextUrl.pathname.startsWith("/dashboard/team") ||
    req.nextUrl.pathname.startsWith("/api/users/add-member");

  if (isRestrictedAdminRoute) {
    const { data: companyUser, error } = await supabase
      .from("company_users")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !companyUser || companyUser.role !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/users/add-member"],
};
