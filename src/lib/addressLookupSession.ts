import { requestAddresses, type AddressRequest, type AddressResult, type MapboxAddressConfig } from './deliveryLocation';

interface LookupHandlers {
  result: (addresses: AddressResult[]) => void;
  error: (error: unknown) => void;
}
type Schedule = (task: () => void, delay: number) => () => void;
const schedule: Schedule = (task, delay) => {
  const timer = setTimeout(task, delay);
  return () => clearTimeout(timer);
};

/** One address request for the picker; edits, another selection and closing invalidate it. */
export class AddressLookupSession {
  private revision = 0;
  private controller: AbortController | null = null;
  private cancelTimer: (() => void) | null = null;
  private config: MapboxAddressConfig;
  private fetcher: typeof fetch;
  private scheduleTask: Schedule;

  constructor(config: MapboxAddressConfig, fetcher: typeof fetch = fetch, scheduleTask: Schedule = schedule) {
    this.config = config;
    this.fetcher = fetcher;
    this.scheduleTask = scheduleTask;
  }

  cancel(): void {
    this.revision++;
    this.cancelTimer?.();
    this.cancelTimer = null;
    this.controller?.abort();
    this.controller = null;
  }

  lookup(request: AddressRequest, handlers: LookupHandlers, delay = 0): void {
    this.cancel();
    const revision = this.revision;
    const controller = new AbortController();
    this.controller = controller;
    const run = async () => {
      if (revision !== this.revision || controller.signal.aborted) return;
      this.cancelTimer = null;
      try {
        const addresses = await requestAddresses(this.config, request, controller.signal, this.fetcher);
        if (revision === this.revision && !controller.signal.aborted) handlers.result(addresses);
      } catch (error: unknown) {
        if (revision === this.revision && !controller.signal.aborted) handlers.error(error);
      } finally {
        if (revision === this.revision) this.controller = null;
      }
    };
    if (delay > 0) this.cancelTimer = this.scheduleTask(() => { void run(); }, delay);
    else void run();
  }
}
