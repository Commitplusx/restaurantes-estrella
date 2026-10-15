import { createKitchenAlarm } from "../src/lib/kitchenAlarm.ts";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

Deno.test("kitchen alarm has one timer and stops playback when accepted", () => {
  let nextHandle = 0;
  let plays = 0;
  let stops = 0;
  const scheduled = new Map<number, () => void>();
  const cancelled: number[] = [];
  const alarm = createKitchenAlarm(
    () => { plays += 1; },
    () => { stops += 1; },
    {
      schedule(callback, intervalMs) {
        assert(intervalMs === 4_000, "new-order alarm interval must remain four seconds");
        const handle = nextHandle++;
        scheduled.set(handle, callback);
        return handle;
      },
      cancel(handle) {
        cancelled.push(handle);
        scheduled.delete(handle);
      },
    },
  );

  alarm.start();
  alarm.start();
  assert(plays === 1 && scheduled.size === 1, "start must not create duplicate alarms");
  const timer = scheduled.get(0);
  if (!timer) throw new Error("expected scheduled alarm callback");
  timer();
  assert(plays === 2, "the scheduled interval should ring while the order remains pending");
  alarm.stop();
  assert(!alarm.isRunning() && scheduled.size === 0, "accepting the order must clear the interval");
  assert(cancelled.length === 1 && stops === 1, "stop must cancel the timer and current sound");
  alarm.stop();
  assert(stops === 2, "stop must remain safe when called repeatedly");
});

Deno.test("disposing the orders view clears its outstanding alarm", () => {
  let timerCancelled = false;
  let playbackStopped = false;
  const alarm = createKitchenAlarm(
    () => {},
    () => { playbackStopped = true; },
    {
      schedule: () => 17,
      cancel: (handle) => { timerCancelled = handle === 17; },
    },
  );

  alarm.start();
  alarm.dispose();
  assert(timerCancelled && playbackStopped && !alarm.isRunning(), "unmount must release the timer and audio");
});
