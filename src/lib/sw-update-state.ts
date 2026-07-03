let updateWorker: ServiceWorker | null = null;
const listeners = new Set<() => void>();

export function setUpdateAvailable(worker: ServiceWorker) {
  updateWorker = worker;
  listeners.forEach((cb) => cb());
}

export function getUpdateWorker() {
  return updateWorker;
}

export function onUpdateAvailable(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function dismissUpdate() {
  updateWorker = null;
  listeners.forEach((cb) => cb());
}
