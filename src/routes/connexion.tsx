import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/connexion")({ component: Connexion });

function Connexion() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    nav({ to: "/" });
  };

  return (
    <section className="mx-auto max-w-md">
      <h1 className="font-display text-4xl text-gold">Connexion</h1>
      <form onSubmit={submit} className="mt-6 space-y-4 rounded-xl border border-border bg-card p-5">
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Email</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="input" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Mot de passe</span>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required className="input" />
        </label>
        <button disabled={loading} className="w-full rounded-md bg-gold py-2.5 font-bold disabled:opacity-50">
          {loading ? "..." : "Se connecter"}
        </button>
        <p className="text-center text-sm text-muted-foreground">
          Pas de compte ? <Link to="/inscription" className="text-gold">S'inscrire</Link>
        </p>
      </form>
      <style>{`.input{width:100%;border-radius:.5rem;border:1px solid var(--color-border);background:var(--color-input);padding:.5rem .75rem;color:var(--color-foreground);outline:none}.input:focus{border-color:var(--color-primary)}`}</style>
    </section>
  );
}
