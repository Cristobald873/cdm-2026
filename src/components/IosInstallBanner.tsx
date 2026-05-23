import { useEffect, useState } from "react";
import { Share, X } from "lucide-react";

const DISMISS_KEY = "ios-install-dismissed";

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const iOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  // iPadOS 13+ se présente comme Mac avec touch
  const iPadOS = navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1;
  return iOS || iPadOS;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

function isPreviewOrIframe(): boolean {
  if (typeof window === "undefined") return true;
  try { if (window.self !== window.top) return true; } catch { return true; }
  const h = window.location.hostname;
  return h.includes("id-preview--") || h.includes("lovableproject.com");
}

export function IosInstallBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isPreviewOrIframe()) return;
    if (!isIos() || isStandalone()) return;
    if (typeof localStorage !== "undefined" && localStorage.getItem(DISMISS_KEY)) return;
    const t = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(t);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 rounded-xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur sm:left-auto sm:right-3 sm:max-w-sm">
      <div className="flex items-start gap-3">
        <div className="text-2xl">📲</div>
        <div className="flex-1 text-sm">
          <p className="font-semibold">Installe l'app</p>
          <p className="mt-1 text-muted-foreground">
            Appuie sur <Share className="inline h-4 w-4 align-text-bottom" /> puis “Sur l'écran d'accueil”.
          </p>
        </div>
        <button
          aria-label="Fermer"
          className="rounded-md p-1 text-muted-foreground hover:bg-accent"
          onClick={() => {
            try { localStorage.setItem(DISMISS_KEY, "1"); } catch {}
            setShow(false);
          }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
