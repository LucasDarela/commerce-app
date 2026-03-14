// // middleware.ts
// import { NextResponse, type NextRequest } from "next/server";
// import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

// function isStatic(pathname: string) {
//   return (
//     pathname.startsWith("/_next") ||
//     pathname.startsWith("/favicon.ico") ||
//     pathname.match(/\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt)$/)
//   );
// }

// export async function middleware(req: NextRequest) {
//   const { pathname, hostname, search } = req.nextUrl;

//   // 1) Ignorar assets
//   if (isStatic(pathname)) return NextResponse.next();

//   // 2) Forçar www no domínio raiz (somente páginas)
//   if (hostname === "chopphub.com") {
//     return NextResponse.redirect(
//       new URL(`https://www.chopphub.com${pathname}${search}`),
//       308,
//     );
//   }

//   // 3) Proteger dashboard (somente aqui roda Supabase)
//   if (pathname.startsWith("/dashboard")) {
//     const res = NextResponse.next();
//     const supabase = createMiddlewareClient({ req, res });

//     // getUser pode fazer chamada externa → mantenha o middleware leve
//     const { data, error } = await supabase.auth.getUser();

//     if (error || !data?.user) {
//       return NextResponse.redirect(new URL("/login-signin", req.url));
//     }

//     return res;
//   }

//   return NextResponse.next();
// }

// export const config = {
//   matcher: ["/dashboard/:path*"],
// };

// middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

function isStatic(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.match(/\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt)$/)
  );
}

export async function middleware(req: NextRequest) {
  const { pathname, hostname, search } = req.nextUrl;

  if (isStatic(pathname)) return NextResponse.next();

  if (hostname === "chopphub.com") {
    return NextResponse.redirect(
      new URL(`https://www.chopphub.com${pathname}${search}`),
      308,
    );
  }

  if (pathname.startsWith("/dashboard")) {
    const res = NextResponse.next();
    const supabase = createMiddlewareClient({ req, res });

    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) {
      return NextResponse.redirect(new URL("/login-signin", req.url));
    }

    const { data: companyUser, error: roleError } = await supabase
      .from("company_users")
      .select("role")
      .eq("user_id", data.user.id)
      .single();

    if (!roleError && pathname === "/dashboard" && companyUser?.role === "motorista") {
      return NextResponse.redirect(new URL("/dashboard/orders", req.url));
    }

    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};