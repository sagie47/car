'use client';

import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getBrowserSupabase, isSupabaseConfigured } from '../lib/supabase-browser';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setSession(null);
      return;
    }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured()) return <>{children}</>;
  if (session === undefined) return <main className="auth-screen"><p>Loading secure dealer workspace...</p></main>;
  if (session) return <>{children}</>;

  return (
    <main className="auth-screen">
      <div className="auth-card stack">
        <p className="eyebrow">LotPilot beta</p>
        <h1>Sign in to your dealer workspace</h1>
        <p className="muted">Use the email address that received your invitation.</p>
        <form
          className="stack"
          action={async () => {
            const supabase = getBrowserSupabase();
            if (!supabase) return;
            const { error } = await supabase.auth.signInWithOtp({
              email,
              options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
            });
            setMessage(error ? error.message : 'Check your email for a secure sign-in link.');
          }}
        >
          <label className="field">
            <span>Work email</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <button className="button button-primary">Email me a sign-in link</button>
        </form>
        {message ? <p className="muted">{message}</p> : null}
      </div>
    </main>
  );
}
