import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EMOJI_AVATARS, COLORS } from "@/lib/teams";

export const Route = createFileRoute("/inscription")({ component: Inscription });

function Inscription() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pseudo, setPseudo] = useState("");
  const [avatar, setAvatar] = useState("⚽");
  const [color, setColor] = useState("#f5c842");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pseudo.trim()) return toast.error("Choisis un pseudo");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { pseudo: pseudo.trim(), avatar, color },
      },
    });
    setLoading(false);
    if (error) {
      if (error.message.toLowerCase().includes("unique") || error.message.toLowerCase().includes("duplicate")) toast.error("Pseudo déjà utilisé");
      else toast.error(error.message);
      return;
    }
    toast.success("Bienvenue !");
    nav({ to: "/" });
  };

  return (
    <section className="mx-auto max-w-md">
      <h1 className="font-display text-4xl text-gold">Inscription</h1>
      <form onSubmit={submit} className="mt-6 space-y-4 rounded-xl border border-border bg-card p-5">
        <Field label="Pseudo">
          <input value={pseudo} onChange={(e) => setPseudo(e.target.value)} required className="input" placeholder="MaximusPronostic" />
        </Field>
        <Field label="Email">
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="input" />
        </Field>
        <Field label="Mot de passe">
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required minLength={6} className="input" />
        </Field>
        <Field label="Avatar">
          <div className="flex flex-wrap gap-1">
            {EMOJI_AVATARS.map((e) => (
              <button type="button" key={e} onClick={() => setAvatar(e)}
                className={`rounded-md p-2 text-xl ${avatar === e ? "bg-gold" : "bg-secondary"}`}>{e}</button>
            ))}
          </div>
        </Field>
        <Field label="Couleur">
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button type="button" key={c} onClick={() => setColor(c)}
                className={`h-8 w-8 rounded-full border-2 ${color === c ? "border-foreground" : "border-transparent"}`}
                style={{ background: c }} />
            ))}
          </div>
        </Field>
        <button disabled={loading} className="w-full rounded-md bg-gold py-2.5 font-bold disabled:opacity-50">
          {loading ? "..." : "Créer mon compte"}
        </button>
        <p className="text-center text-sm text-muted-foreground">
          Déjà un compte ? <Link to="/connexion" className="text-gold">Se connecter</Link>
        </p>
      </form>
      <style>{`.input{width:100%;border-radius:.5rem;border:1px solid var(--color-border);background:var(--color-input);padding:.5rem .75rem;color:var(--color-foreground);outline:none}.input:focus{border-color:var(--color-primary)}`}</style>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">{label}</span>{children}</label>;
}
