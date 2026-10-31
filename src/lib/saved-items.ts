let items: string[] = [];
const listeners = new Set<() => void>();

export function getSavedItems() { return items; }
export function subscribeSavedItems(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function toggleSavedItem(item: string) {
  items = items.includes(item) ? items.filter((value) => value !== item) : [...items, item];
  listeners.forEach((listener) => listener());
}
