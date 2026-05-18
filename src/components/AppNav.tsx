import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Trophy, ListChecks, Sparkles, Swords, Medal, BookOpen, Shield, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";

const NAV = [
  { to: "/", label: "Accueil", icon: Trophy },
  { to: "/pronostics/groupes", label: "Groupes", icon: ListChecks },
  { to: "/pronostics/eliminatoires", label: "Éliminatoires", icon: Swords },
  { to: "/pronostics/pre-tournoi", label: "Qualifications", icon: Sparkles },
  { to: "/classements", label: "Classements", icon: Trophy },
  { to: "/podium", label: "Podium", icon: Medal },
  { to: "/regles", label: "Règles", icon: BookOpen },
] as const;

export function AppNav() {
  const { profile, user, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">⚽</span>
          <span className="font-display text-2xl tracking-wide text-gold">PRONOS CDM 26</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              activeProps={{ className: "bg-accent text-foreground" }}>
              {n.label}
            </Link>
          ))}
          {profile?.is_admin && (
            <Link to="/admin" className="rounded-md px-3 py-1.5 text-sm font-medium text-primary hover:bg-accent"
              activeProps={{ className: "bg-accent" }}>
              <Shield className="mr-1 inline h-4 w-4" />Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link to="/classements" className="hidden items-center gap-2 rounded-full border border-border px-3 py-1 text-sm md:flex"
                style={{ borderColor: profile?.color }}>
                <span>{profile?.avatar ?? "⚽"}</span>
                <span className="font-medium">{profile?.pseudo}</span>
              </Link>
              <button onClick={signOut} className="rounded-md p-2 text-muted-foreground hover:text-foreground" aria-label="Se déconnecter">
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <Link to="/connexion" className="hidden rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground sm:block">Connexion</Link>
              <Link to="/inscription" className="rounded-md bg-gold px-3 py-1.5 text-sm font-bold">S'inscrire</Link>
            </>
          )}
          <button className="lg:hidden p-2" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-border bg-card lg:hidden">
          <div className="mx-auto flex max-w-6xl flex-col p-2">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                activeProps={{ className: "bg-accent text-foreground" }}>
                <n.icon className="h-4 w-4" />{n.label}
              </Link>
            ))}
            {profile?.is_admin && (
              <Link to="/admin" onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-primary hover:bg-accent">
                <Shield className="h-4 w-4" />Admin
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
