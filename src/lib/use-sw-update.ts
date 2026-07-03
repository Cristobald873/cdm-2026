// Détecte les nouvelles versions du service worker, active automatiquement
// le nouveau SW et affiche une bannière de mise à jour.
// Stratégie :
// 1. Enregistre /sw.js en mode `updateViaCache: 'none'`.
// 2. Quand un nouveau SW est installé et qu'un contrôleur existe déjà,
//    on envoie SKIP_WAITING pour forcer l'activation immédiate.
// 3. À controllerchange, on recharge la page une seule fois.
// 4. En parallèle, une bannière discrète informe l'utilisateur.
import { useEffect } from "react";
import { setUpdateAvailable } from "./sw-update-state";

function isPreviewOrIframe(): boolean {
  if (typeof window === "undefined") return true;
  try { if (window.self !== window.top) return true; } catch { return true; }
  const h = window.location.hostname;
  return h.includes("id-preview--") || h.includes("lovableproject.com");
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

        const handleInstalled = (worker: ServiceWorker) => {
          if (navigator.serviceWorker.controller) {
            // Nouveau SW disponible — activer immédiatement
            setUpdateAvailable(worker);
            worker.postMessage({ type: "SKIP_WAITING" });
          }
        };

        const watch = (worker: ServiceWorker | null) => {
          if (!worker) return;
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            handleInstalled(worker);
            return;
          }
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              handleInstalled(worker);
            }
          });
        };

        // Cas 1 : déjà en waiting au chargement
        if (reg.waiting && navigator.serviceWorker.controller) {
          handleInstalled(reg.waiting);
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
