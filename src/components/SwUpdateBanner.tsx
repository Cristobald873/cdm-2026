import { useCallback, useEffect, useState } from "react";
import { getUpdateWorker, onUpdateAvailable, dismissUpdate } from "@/lib/sw-update-state";

export function SwUpdateBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const check = () => {
      setVisible(!!getUpdateWorker());
    };
    check();
    return onUpdateAvailable(check);
  }, []);

  const handleUpdate = useCallback(() => {
    const worker = getUpdateWorker();
    if (worker) {
      worker.postMessage({ type: "SKIP_WAITING" });
    }
    dismissUpdate();
    window.location.reload();
  }, []);

  if (!visible) return null;

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-3 bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-md">
      <span role="img" aria-label="mise à jour">
        🔄
      </span>
      <span>Une nouvelle version est disponible</span>
      <button
        onClick={handleUpdate}
        className="rounded-md bg-primary-foreground px-3 py-1 text-xs font-bold text-primary hover:opacity-90"
      >
        Mettre à jour
      </button>
    </div>
  );
}
