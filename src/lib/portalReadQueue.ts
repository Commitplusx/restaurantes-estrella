/** Coalesce concurrent reads; an explicit refresh during a read gets a later read.
 * Events drive follow-ups. Failures are returned without automatic retries. */
export function createPortalReadQueue() {
  const pending = new Map<string, { promise: Promise<void>; next: (() => Promise<void>) | null }>();
  return {
    clear() {
      for (const entry of pending.values()) entry.next = null;
      pending.clear();
    },
    run(key: string, load: () => Promise<void>, afterPending = false): Promise<void> {
      const current = pending.get(key);
      if (current) {
        if (afterPending) current.next = load;
        return current.promise;
      }
      const entry = { promise: Promise.resolve(), next: null as (() => Promise<void>) | null };
      entry.promise = Promise.resolve().then(async () => {
        let task: (() => Promise<void>) | null = load;
        try {
          while (task) {
            await task();
            task = entry.next;
            entry.next = null;
          }
        } finally {
          if (pending.get(key) === entry) pending.delete(key);
        }
      });
      pending.set(key, entry);
      return entry.promise;
    },
  };
}
