export interface KitchenAlarmScheduler<Handle> {
  schedule(callback: () => void, intervalMs: number): Handle;
  cancel(handle: Handle): void;
}

export interface KitchenAlarm {
  start(): void;
  stop(): void;
  dispose(): void;
  isRunning(): boolean;
}

export function createKitchenAlarm<Handle>(
  play: () => void,
  stopPlayback: () => void,
  scheduler: KitchenAlarmScheduler<Handle>,
  intervalMs = 4_000,
): KitchenAlarm {
  let interval: Handle | null = null;

  const stop = () => {
    if (interval !== null) {
      scheduler.cancel(interval);
      interval = null;
    }
    stopPlayback();
  };

  return {
    start() {
      if (interval !== null) return;
      play();
      interval = scheduler.schedule(play, intervalMs);
    },
    stop,
    dispose: stop,
    isRunning: () => interval !== null,
  };
}
