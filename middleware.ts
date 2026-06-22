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

  const res = NextResponse.next();
  const supabase = createSupabaseMiddlewareClient(req, res);

  // Chamamos getUser apenas UMA VEZ e reaproveitamos o resultado
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (hostname === "chopphub.com") {
    return NextResponse.redirect(
      new URL(`https://www.chopphub.com${pathname}${search}`),
      308,
    );
  }

  // --- LÓGICA DO SUBDOMÍNIO ADMIN ---
  const host = req.headers.get("host") || "";
  const isAdminSubdomain = host.startsWith("admin.chopphub.com") || host.startsWith("admin.localhost");

  if (isAdminSubdomain) {
    // Evita loop se a URL interna já for /admin
    if (pathname.startsWith("/admin")) {
      return res; 
    }

    // Se o usuário não está logado e está tentando acessar qualquer coisa no admin, manda pro login
    if (!user && pathname !== "/login") {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // Se o usuário está logado, verificamos se ele é super admin
    if (user && pathname !== "/login") {
      // Como is_super_admin é uma coluna customizada física em auth.users, precisamos de uma RPC para ler
      const { data: isSuperAdmin } = await supabase.rpc("is_super_admin");

      if (!isSuperAdmin) {
        // Se não for admin, derruba o acesso
        return NextResponse.redirect(new URL("/login?error=unauthorized", req.url));
      }
    }

    // Reescreve a URL visível (admin.chopphub.com/) para a pasta interna (/app/admin/)
    return NextResponse.rewrite(new URL(`/admin${pathname === "/" ? "" : pathname}${search}`, req.url));
  }
  // --- FIM LÓGICA ADMIN ---

  if (pathname.startsWith("/dashboard")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login-signin", req.url));
    }

    // ✅ Validação de Sessão Única
    const sessionMarker = req.cookies.get("session_marker")?.value;

    const { data: profile } = await supabase
      .from("profiles")
      .select("current_session_id")
      .eq("id", user.id)
      .single();

    if (profile?.current_session_id && profile.current_session_id !== sessionMarker) {
      // Sessão foi invalidada por um login mais recente
      console.log(`[Middleware] Sessão invalidada para o usuário ${user.id}. DB: ${profile.current_session_id}, Cookie: ${sessionMarker}`);
      
      const response = NextResponse.redirect(new URL("/login-signin?error=multiple_sessions", req.url));
      
      // Limpa os cookies de autenticação e o marcador
      await supabase.auth.signOut();
      response.cookies.delete("session_marker");
      
      return response;
    }
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files with extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|api/asaas/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt)$).*)",
  ],
};