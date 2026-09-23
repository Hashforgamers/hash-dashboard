/** Bounded-latency batching: continuous events cannot postpone reconciliation forever. */
export function createEventBatch<T>(
  flush: (keys: Set<T>) => void,
  delayMs = 5_000,
  schedule: (callback: () => void, delay: number) => ReturnType<typeof setTimeout> = setTimeout,
  cancel: (timer: ReturnType<typeof setTimeout>) => void = clearTimeout,
) {
  const dirty = new Set<T>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  return {
    add(key: T) {
      dirty.add(key);
      if (timer !== undefined) return;
      timer = schedule(() => {
        timer = undefined;
        const keys = new Set(dirty);
        dirty.clear();
        flush(keys);
      }, delayMs);
    },
    dispose() {
      if (timer !== undefined) cancel(timer);
      timer = undefined;
      dirty.clear();
    },
  };
}
