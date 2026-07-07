import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// Provides: the logged-in Supabase auth user, their app profile row
// (which has the role: 'client' | 'sitter'), and loading state.
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Loads the profile row for this user, creating it on first login if it
  // doesn't exist yet. We create it here (not at signup) because this only
  // ever runs once a real session exists, which is what Row Level Security
  // requires for the insert to be allowed.
  async function loadProfile(sessionUser) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', sessionUser.id)
      .single();
    if (data) return data;

    const fallbackName = sessionUser.user_metadata?.full_name || 'New user';
    const { data: created, error: insertError } = await supabase
      .from('profiles')
      .insert({ id: sessionUser.id, full_name: fallbackName, role: 'client' })
      .select()
      .single();
    if (insertError) {
      console.error('Failed to create profile', insertError);
      return null;
    }
    return created;
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setProfile(await loadProfile(session.user));
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setProfile(await loadProfile(session.user));
      } else {
        setUser(null);
        setProfile(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  const value = {
    user,
    profile,
    loading,
    isSitter: profile?.role === 'sitter',
    signOut,
    refreshProfile: async () => user && setProfile(await loadProfile(user)),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
