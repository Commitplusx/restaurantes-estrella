export interface PublicSnapshot<T> {
  readonly data: T | undefined;
  readonly updatedAt: number;
  readonly fetching: boolean;
  readonly error: Error | null;
}

export interface PublicCachePolicy {
  freshFor: number;
  retainFor: number;
  retryAfter: number;
  timeout: number;
}

export const PUBLIC_CATALOG_POLICY: PublicCachePolicy = {
  freshFor: 30_000, retainFor: 300_000, retryAfter: 10_000, timeout: 10_000,
};
export const PUBLIC_MENU_POLICY: PublicCachePolicy = {
  freshFor: 20_000, retainFor: 120_000, retryAfter: 10_000, timeout: 10_000,
};

/** Memory only. Never used for sessions, customers, checkout or order state. */
export class PublicResource<T> {
  private state: PublicSnapshot<T> = { data: undefined, updatedAt: 0, fetching: false, error: null };
  private listeners = new Set<() => void>();
  private inFlight: Promise<void> | null = null;
  private revision = 0;
  private dirty = false;
  private failedAt: number | null = null;
  private readonly load: (signal: AbortSignal) => Promise<T>;
  readonly policy: PublicCachePolicy;
  private readonly now: () => number;

  constructor(
    load: (signal: AbortSignal) => Promise<T>,
    policy = PUBLIC_CATALOG_POLICY,
    now: () => number = Date.now,
  ) { this.load = load; this.policy = policy; this.now = now; }

  readonly snapshot = (): PublicSnapshot<T> => this.state;
  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  get active(): boolean { return this.listeners.size > 0 || this.inFlight !== null; }
  visible(): T | undefined {
    return this.now() - this.state.updatedAt < this.policy.retainFor ? this.state.data : undefined;
  }
  expire(): void {
    if (this.state.data !== undefined && this.visible() === undefined) {
      this.publish({ ...this.state, data: undefined, error: this.state.error || new Error('La información guardada venció. Conéctate y vuelve a actualizarla.') });
    }
  }
  private publish(next: PublicSnapshot<T>): void {
    this.state = next;
    this.listeners.forEach(listener => listener());
  }

  invalidate(): void {
    this.revision++;
    this.dirty = true;
  }

  /** One shared request, a deadline, no retry loop and no obsolete response wins. */
  refresh(force = false): Promise<void> {
    if (this.inFlight) return this.inFlight;
    const now = this.now();
    if (!force && this.failedAt !== null && now - this.failedAt < this.policy.retryAfter) return Promise.resolve();
    if (!force && !this.dirty && this.state.data !== undefined && now - this.state.updatedAt < this.policy.freshFor) return Promise.resolve();
    const controller = new AbortController();
    const revision = this.revision;
    const previous = this.visible();
    this.publish({ ...this.state, data: previous, fetching: true, error: null });
    let deadline: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
      deadline = setTimeout(() => {
        controller.abort();
        reject(new Error('La consulta tardó demasiado. Vuelve a intentarlo.'));
      }, this.policy.timeout);
    });
    // A rejected load is also observed by Promise.race after a timeout.
    this.inFlight = Promise.race([Promise.resolve().then(() => this.load(controller.signal)), timeout])
      .then(data => {
        if (revision !== this.revision) return;
        this.dirty = false;
        this.failedAt = null;
        this.publish({ data, updatedAt: this.now(), fetching: true, error: null });
      })
      .catch((cause: unknown) => {
        if (revision !== this.revision) return;
        this.failedAt = this.now();
        this.publish({ ...this.state, data: this.visible(), error: cause instanceof Error ? cause : new Error('No pudimos actualizar el catálogo.') });
      })
      .finally(() => {
        clearTimeout(deadline);
        this.inFlight = null;
        this.publish({ ...this.state, data: this.visible(), fetching: false });
      });
    return this.inFlight;
  }
}

/** Each pool has one concrete data contract and a bounded LRU of inactive entries. */
export class PublicResourcePool<T> {
  private entries = new Map<string, PublicResource<T>>();
  private readonly limit: number;
  constructor(limit: number) { this.limit = limit; }
  get(key: string, create: () => PublicResource<T>): PublicResource<T> {
    const existing = this.entries.get(key);
    if (existing) {
      this.entries.delete(key);
      this.entries.set(key, existing);
      return existing;
    }
    for (const [oldKey, entry] of this.entries) {
      if (this.entries.size < this.limit) break;
      if (!entry.active) this.entries.delete(oldKey);
    }
    const entry = create();
    // An exceptional number of mounted consumers can use an uncached resource.
    if (this.entries.size < this.limit) this.entries.set(key, entry);
    return entry;
  }
  invalidateAll(): void { this.entries.forEach(entry => entry.invalidate()); }
  get size(): number { return this.entries.size; }
}
