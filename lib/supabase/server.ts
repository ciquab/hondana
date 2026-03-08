import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { env } from '@/lib/env';

type CookieStoreLike = {
  getAll: () => { name: string; value: string }[];
  set: (name: string, value: string, options: CookieOptions) => void;
};

async function resolveCookieStore(): Promise<CookieStoreLike | null> {
  try {
    // NOTE:
    // Keep this as a dynamic import so this module can be imported safely even
    // from non-App-Router contexts (e.g. pages/), where `next/headers` is not supported.
    const { cookies } = await import('next/headers');
    return (await cookies()) as unknown as CookieStoreLike;
  } catch {
    return null;
  }
}

export async function createClient() {
  const cookieStore = await resolveCookieStore();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore?.getAll() ?? [];
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          if (!cookieStore) return;
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        }
      }
    }
  );
}
