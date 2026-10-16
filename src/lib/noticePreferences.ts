const memory = new Map<string, string>();
export function readPreference(key: string): string | null {
  try { return memory.get(key) ?? localStorage.getItem(key); } catch { return memory.get(key) ?? null; }
}
export function writePreference(key: string, value: string): void {
  memory.set(key, value);
  try { localStorage.setItem(key, value); } catch { console.warn('notice_preference_storage_unavailable'); }
}
