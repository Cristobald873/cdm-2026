import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth-context";
import { AppNav } from "@/components/AppNav";
import { Toaster } from "sonner";
import { usePushSetup } from "@/lib/use-push";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl text-gold">404</h1>
        <p className="mt-4 text-muted-foreground">Cette page n'existe pas (ou n'a pas encore été pronostiquée).</p>
        <Link to="/" className="mt-6 inline-flex rounded-md bg-gold px-4 py-2 font-bold">Retour à l'accueil</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-3xl">Carton rouge 🟥</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button onClick={() => { router.invalidate(); reset(); }} className="mt-4 rounded-md bg-gold px-4 py-2 font-bold">Réessayer</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Pronos CdM 2026" },
      { name: "description", content: "Pronostics entre amis pour la Coupe du Monde 2026." },
      { name: "theme-color", content: "#0a0e1a" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Pronos CdM 26" },
      { name: "mobile-web-app-capable", content: "yes" },
      { property: "og:title", content: "Pronos CdM 2026" },
      { name: "twitter:title", content: "Pronos CdM 2026" },
      { property: "og:description", content: "Pronostics entre amis pour la Coupe du Monde 2026." },
      { name: "twitter:description", content: "Pronostics entre amis pour la Coupe du Monde 2026." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/ENkCvTCwhmgMKzzHjXe7AtW2Mct1/social-images/social-1778847049991-ChatGPT_Image_15_mai_2026,_14_10_43.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/ENkCvTCwhmgMKzzHjXe7AtW2Mct1/social-images/social-1778847049991-ChatGPT_Image_15_mai_2026,_14_10_43.webp" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "apple-touch-icon", href: "/icon-512.png" },
      { rel: "icon", type: "image/png", href: "/icon-512.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@400;500;600;700;800&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function PushBootstrap() {
  usePushSetup();
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PushBootstrap />
        <AppNav />
        <main className="mx-auto max-w-6xl px-4 py-6">
          <Outlet />
        </main>
        <Toaster theme="dark" position="top-center" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
