export function isUpdateBlocked(pathname: string): boolean {
  return /\/carrito\/?$/.test(pathname) || /^\/(portal|login)(\/|$)/.test(pathname);
}

export function createUpdateProbe({ update, eligible, installing, now, onError }: {
  update: () => Promise<unknown>;
  eligible: () => boolean;
  installing: () => boolean;
  now: () => number;
  onError: () => void;
}) {
  let pending = false;
  let lastAttempt: number | null = null;
  return async () => {
    const time = now();
    if (pending || !eligible() || installing() || (lastAttempt !== null && time - lastAttempt < 60_000)) return;
    pending = true;
    lastAttempt = time;
    try { await update(); }
    catch { onError(); }
    finally { pending = false; }
  };
}
