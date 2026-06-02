import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({ component: ResetPassword });

function ResetPassword() {
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase auto-handles recovery token from URL hash via detectSessionInUrl.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Mot de passe trop court (min 6).");
    if (password !== confirm) return toast.error("Les mots de passe ne correspondent pas.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Mot de passe mis à jour");
    nav({ to: "/" });
  };

  return (
    <section className="mx-auto max-w-md">
      <h1 className="font-display text-4xl text-gold">Réinitialiser le mot de passe</h1>
      {!ready ? (
        <p className="mt-6 text-muted-foreground">Vérification du lien…</p>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4 rounded-xl border border-border bg-card p-5">
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Nouveau mot de passe</span>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required className="input" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Confirmer</span>
            <input value={confirm} onChange={(e) => setConfirm(e.target.value)} type="password" required className="input" />
          </label>
          <button disabled={loading} className="w-full rounded-md bg-gold py-2.5 font-bold disabled:opacity-50">
            {loading ? "..." : "Valider"}
          </button>
        </form>
      )}
      <style>{`.input{width:100%;border-radius:.5rem;border:1px solid var(--color-border);background:var(--color-input);padding:.5rem .75rem;color:var(--color-foreground);outline:none}.input:focus{border-color:var(--color-primary)}`}</style>
    </section>
  );
}
