// Détecte les nouvelles versions du service worker et propose à
// l'utilisateur de recharger via un toast. Stratégie :
// 1. Enregistre /sw.js (si pas déjà fait) en mode `updateViaCache: 'none'`
//    pour que le navigateur ne mette pas en cache le script du SW.
// 2. Vérifie les updates au démarrage, au focus de l'onglet, et toutes
//    les 30 minutes.
// 3. Quand un nouveau SW passe en `waiting`, on affiche un toast persistant
//    "Mise à jour disponible". Au clic → postMessage SKIP_WAITING.
// 4. À l'événement `controllerchange`, on recharge la page une seule fois.
import { useEffect } from "react";
import { toast } from "sonner";

function isPreviewOrIframe(): boolean {
  if (typeof window === "undefined") return true;
  try { if (window.self !== window.top) return true; } catch { return true; }
  const h = window.location.hostname;
  return h.includes("id-preview--") || h.includes("lovableproject.com");
}

function promptUpdate(worker: ServiceWorker) {
  toast("✨ Mise à jour disponible", {
    description: "Une nouvelle version de l'app est prête.",
    duration: Infinity,
    id: "sw-update",
    action: {
      label: "Recharger",
      onClick: () => worker.postMessage("SKIP_WAITING"),
    },
  });
}

export function useSwUpdate() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isPreviewOrIframe()) return;
    if (!("serviceWorker" in navigator)) return;

    let reloaded = false;
    const onControllerChange = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    let cleanupInterval: (() => void) | undefined;
    let cleanupFocus: (() => void) | undefined;

    (async () => {
      try {
        const reg =
          (await navigator.serviceWorker.getRegistration("/sw.js")) ||
          (await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }));

        const watch = (worker: ServiceWorker | null) => {
          if (!worker) return;
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            promptUpdate(worker);
            return;
          }
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              promptUpdate(worker);
            }
          });
        };

        // Cas 1 : déjà en waiting au chargement
        if (reg.waiting && navigator.serviceWorker.controller) {
          promptUpdate(reg.waiting);
        }
        // Cas 2 : un nouveau SW est en cours d'installation
        watch(reg.installing);
        // Cas 3 : updatefound déclenché plus tard
        reg.addEventListener("updatefound", () => watch(reg.installing));

        // Re-checks périodiques + au focus
        const check = () => { reg.update().catch(() => {}); };
        const interval = window.setInterval(check, 30 * 60 * 1000);
        cleanupInterval = () => window.clearInterval(interval);
        const onFocus = () => check();
        window.addEventListener("focus", onFocus);
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") check();
        });
        cleanupFocus = () => window.removeEventListener("focus", onFocus);
      } catch (e) {
        console.warn("sw update setup failed", e);
      }
    })();

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      cleanupInterval?.();
      cleanupFocus?.();
    };
  }, []);
}
