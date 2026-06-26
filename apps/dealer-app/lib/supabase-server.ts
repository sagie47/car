import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function getServerAccessToken() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const cookieStore = await cookies();
  const client = createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => undefined
    }
  });
  const { data } = await client.auth.getSession();
  return data.session?.access_token ?? null;
}
