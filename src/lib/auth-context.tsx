import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

type Profile = {
  id: string;
  pseudo: string;
  avatar: string;
  color: string;
  is_admin: boolean;
};

type AuthCtx = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
    setProfile((data as Profile) ?? null);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(() => loadProfile(s.user.id), 0);
      } else setProfile(null);
      setLoading(false);
    });
    supabase.auth.getSession()
      .then(({ data }) => {
        setSession(data.session);
        if (data.session?.user) loadProfile(data.session.user.id);
      })
      .catch((e) => console.warn("getSession failed", e))
      .finally(() => setLoading(false));
    // Safety: never leave the app stuck on loading (e.g. PWA standalone, storage partitioned)
    const failsafe = setTimeout(() => setLoading(false), 3000);
    return () => { sub.subscription.unsubscribe(); clearTimeout(failsafe); };
  }, []);

  return (
    <Ctx.Provider
      value={{
        user: session?.user ?? null,
        session,
        profile,
        loading,
        signOut: async () => { await supabase.auth.signOut(); },
        refreshProfile: async () => { if (session?.user) await loadProfile(session.user.id); },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside provider");
  return c;
}
