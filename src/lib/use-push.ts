// Hook client: enregistre le service worker, demande la permission,
// crée l'abonnement Web Push et le sauvegarde côté serveur.
import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { savePushSubscription } from "@/lib/push.functions";

const VAPID_PUBLIC_KEY = "BEKIEshhk03ubWe4-0ObRHEdesxOE6uKmntqgpFXHWmzk6dFX1raykrrk7JXfnq5K6nETDyq8Dch1P-LlNkyaJA";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function isPreviewOrIframe(): boolean {
  if (typeof window === "undefined") return true;
  try { if (window.self !== window.top) return true; } catch { return true; }
  const h = window.location.hostname;
  return h.includes("id-preview--") || h.includes("lovableproject.com");
}

async function subscribeAndSave(save: ReturnType<typeof useServerFn<typeof savePushSubscription>>) {
  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }
  const json = sub.toJSON() as any;
  await save({ data: {
    endpoint: sub.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
    userAgent: navigator.userAgent.slice(0, 500),
  } });
}

export function usePushSetup() {
  const { user } = useAuth();
  const save = useServerFn(savePushSubscription);
  const prompted = useRef(false);

  useEffect(() => {
    if (!user || prompted.current) return;
    if (typeof window === "undefined") return;
    if (isPreviewOrIframe()) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;

    prompted.current = true;
    const perm = Notification.permission;

    if (perm === "granted") {
      subscribeAndSave(save).catch((e) => console.warn("push subscribe failed", e));
      return;
    }
    if (perm === "denied") return;

    // default → demander via un toast non-bloquant
    const t = setTimeout(() => {
      toast("🔔 Active les notifications", {
        description: "Reçois un rappel 1h avant chaque match et les résultats en direct.",
        duration: 10000,
        action: {
          label: "Activer",
          onClick: async () => {
            try {
              const p = await Notification.requestPermission();
              if (p === "granted") {
                await subscribeAndSave(save);
                toast.success("Notifications activées !");
              }
            } catch (e) {
              toast.error("Impossible d'activer les notifications");
            }
          },
        },
      });
    }, 2500);
    return () => clearTimeout(t);
  }, [user, save]);
}
