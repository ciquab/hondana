import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// 親（Supabase認証）が必要なルート
const parentProtectedRoutes = ['/dashboard', '/settings', '/children', '/records'];

// こどもセッション（kid_session_child_id Cookie）が必要なルート
const kidProtectedRoutes = ['/kids/home', '/kids/calendar', '/kids/messages', '/kids/records'];

function redirectKidRecordPathIfNeeded(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const kidSession = request.cookies.get('kid_session')?.value;

  if (!kidSession) return null;

  const match = pathname.match(/^\/records\/([^/]+)$/);
  if (!match) return null;

  const url = request.nextUrl.clone();
  url.pathname = `/kids/records/${match[1]}`;
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
<<<<<<< Updated upstream
  const kidRedirect = redirectKidRecordPathIfNeeded(request);
  if (kidRedirect) return kidRedirect;
=======
  const { pathname } = request.nextUrl;

  // こどもルートの保護（親認証は不要、kid sessionのみ確認）
  if (kidProtectedRoutes.some((route) => pathname.startsWith(route))) {
    const kidSession = request.cookies.get('kid_session_child_id');
    if (!kidSession?.value) {
      const url = request.nextUrl.clone();
      url.pathname = '/kids/login';
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request: { headers: request.headers } });
  }
>>>>>>> Stashed changes

  const response = NextResponse.next({
    request: {
      headers: request.headers
    }
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        }
      }
    }
  );

  const {
    data: { user }
  } = await supabase.auth.getUser();

<<<<<<< Updated upstream
  const isProtected = protectedRoutes.some((route) => request.nextUrl.pathname.startsWith(route));
=======
  const isParentProtected = parentProtectedRoutes.some((route) => pathname.startsWith(route));
>>>>>>> Stashed changes

  if (isParentProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (pathname === '/login' && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
