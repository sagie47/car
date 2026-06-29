import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const response = NextResponse.redirect(new URL('/', requestUrl.origin));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!code || !url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.headers.get('cookie')?.split(';').map((part) => {
        const [name, ...value] = part.trim().split('=');
        return { name, value: value.join('=') };
      }) ?? [],
      setAll: (cookies) => cookies.forEach((cookie) => response.cookies.set(cookie.name, cookie.value, cookie.options))
    }
  });
  await supabase.auth.exchangeCodeForSession(code);
  return response;
}
