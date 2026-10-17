type Listener = () => void;
type Connect = (topic: string, changed: Listener) => () => Promise<void>;

// Supabase reuses channels with the same topic. Share their lifetime too, so
// unmounting the home card cannot unsubscribe the floating tracker.
export function createTrackingHints(connect: Connect, onError: () => void) {
  interface Entry {
    listeners: Set<Listener>;
    stop: (() => Promise<void>) | null;
    closing: boolean;
  }
  const entries = new Map<string, Entry>();
  const open = (topic: string, entry: Entry) => {
    if (entry.stop || entry.closing || !entry.listeners.size) return;
    try {
      entry.stop = connect(topic, () => {
        for (const listener of [...entry.listeners]) listener();
      });
    } catch { onError(); } // The bounded RPC polling remains the recovery path.
  };
  return (topic: string, listener: Listener): (() => void) => {
    let entry = entries.get(topic);
    if (!entry) {
      entry = {listeners: new Set(), stop: null, closing: false};
      entries.set(topic, entry);
    }
    const current = entry;
    const notify = () => listener();
    current.listeners.add(notify);
    open(topic, current);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      current.listeners.delete(notify);
      queueMicrotask(() => {
        if (current.listeners.size || current.closing) return;
        const stop = current.stop;
        current.stop = null;
        if (!stop) { entries.delete(topic); return; }
        current.closing = true;
        const finished = () => {
          current.closing = false;
          if (current.listeners.size) open(topic, current);
          else entries.delete(topic);
        };
        void stop().then(finished, () => { onError(); finished(); });
      });
    };
  };
}
