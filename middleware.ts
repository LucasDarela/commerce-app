// middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

type SupabaseCookie = {
  name: string;
  value: string;
  options?: CookieOptions;
};

function isStatic(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.match(/\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt)$/)
  );
}

function createSupabaseMiddlewareClient(req: NextRequest, res: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet: SupabaseCookie[]) {
          cookiesToSet.forEach(
            ({
              name,
              value,
              options,
            }: {
              name: string;
              value: string;
              options?: CookieOptions;
            }) => {
              res.cookies.set(name, value, options);
            },
          );
        },
      },
    },
  );
}

export async function middleware(req: NextRequest) {
  const { pathname, hostname, search } = req.nextUrl;

  if (isStatic(pathname)) {
    return NextResponse.next();
  }

  if (hostname === "chopphub.com") {
    return NextResponse.redirect(
      new URL(`https://www.chopphub.com${pathname}${search}`),
      308,
    );
  }

  if (pathname.startsWith("/dashboard")) {
    const res = NextResponse.next();
    const supabase = createSupabaseMiddlewareClient(req, res);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.redirect(new URL("/login-signin", req.url));
    }

    const { data: companyUser, error: roleError } = await supabase
      .from("company_users")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const normalizedRole =
      companyUser?.role === "motorista"
        ? "driver"
        : companyUser?.role === "usuario"
          ? "normal"
          : companyUser?.role;

    if (!roleError && pathname === "/dashboard" && normalizedRole === "driver") {
      return NextResponse.redirect(new URL("/dashboard/orders", req.url));
    }

    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};