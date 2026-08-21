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
      global: {
        fetch: (url: RequestInfo | URL, options?: RequestInit) => {
          return fetch(url, { ...options, cache: "no-store" });
        },
      },
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
    // Lê o marcador: primeiro do query param (recente, logo após login),
    // depois do cookie (sessões subsequentes).
    const smQuery = req.nextUrl.searchParams.get("sm");
    const sessionMarker = smQuery || req.cookies.get("session_marker")?.value;

    if (smQuery) {
      // Se recebemos via query param, re-injetamos no cookie como a fonte de verdade absoluta
      res.cookies.set("session_marker", smQuery, {
        path: "/",
        maxAge: 2592000,
        sameSite: "lax",
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("current_session_id, whatsapp_verified")
      .eq("id", user.id)
      .single();

    // Só invalida se:
    // 1. O banco TEM um session_id cadastrado (ou seja, a feature está ativa)
    // 2. O sessionMarker local existe e é diferente do banco
    // Não invalida se sessionMarker estiver ausente (pode ser primeira request após login)
    if (
      profile?.current_session_id &&
      sessionMarker &&
      profile.current_session_id !== sessionMarker
    ) {
      console.log(`[Middleware] Sessão invalidada para o usuário ${user.id}. DB: ${profile.current_session_id}, Cookie: ${sessionMarker}`);
      
      // Cria o redirect e copia os cookies do Supabase (incluindo auth tokens)
      // para que o browser receba a atualização de cookies corretamente.
      const redirectUrl = new URL("/login-signin?error=multiple_sessions", req.url);
      const response = NextResponse.redirect(redirectUrl);

      // Copia todos os cookies que o Supabase definiu no res original
      // (inclui sb-auth-token e outros) para o response de redirect.
      res.cookies.getAll().forEach((cookie) => {
        response.cookies.set(cookie.name, cookie.value);
      });

      // Apaga o session_marker no browser do dispositivo antigo
      response.cookies.set("session_marker", "", {
        path: "/",
        maxAge: 0,
        expires: new Date(0),
      });
      
      return response;
    }

    // 📱 Verificação de WhatsApp/Telefone (feature flag)
    // Habilitado novamente a pedido do usuário após recarga Twilio
    if (
      process.env.WHATSAPP_VERIFICATION_ENABLED === "true" &&
      profile?.whatsapp_verified === false &&
      !user?.user_metadata?.invited_role
    ) {
      console.log(`[Middleware] WhatsApp não verificado para owner ${user?.id} — redirecionando`);
      return NextResponse.redirect(new URL("/auth/verify-whatsapp", req.url));
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