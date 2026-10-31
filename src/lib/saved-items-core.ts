import { useSyncExternalStore } from 'react';

export type SavedItem = {
  id: string;
  kind: 'route' | 'terminal';
  title: string;
  subtitle: string;
  from?: string;
  to?: string;
};

const ITEMS_KEY = 'route2.saved-items.v1';
const PREFS_KEY = 'route2.preferences.v1';
const listeners = new Set<() => void>();

function readItems(): SavedItem[] {
  try {
    const value = globalThis.localStorage.getItem(ITEMS_KEY);
    const parsed: unknown = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.filter(isSavedItem) : [];
  } catch {
    return [];
  }
}

function isSavedItem(value: unknown): value is SavedItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<SavedItem>;
  return typeof item.id === 'string' &&
    (item.kind === 'route' || item.kind === 'terminal') &&
    typeof item.title === 'string' && typeof item.subtitle === 'string';
}

let items = readItems();
let preferenceRevision = 0;

export function getSavedItems() {
  return items;
}

export function useSavedItems() {
  return useSyncExternalStore(subscribeSavedItems, getSavedItems, getSavedItems);
}

export function usePreferenceRevision() {
  return useSyncExternalStore(subscribeSavedItems, () => preferenceRevision, () => preferenceRevision);
}

export function subscribeSavedItems(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function toggleSavedItem(item: SavedItem) {
  items = items.some((saved) => saved.id === item.id)
    ? items.filter((saved) => saved.id !== item.id)
    : [item, ...items];
  persistItems();
}

export function removeSavedItem(id: string) {
  items = items.filter((item) => item.id !== id);
  persistItems();
}

function persistItems() {
  try {
    globalThis.localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
  } catch {
    // Keep the current session usable if local storage is unavailable.
  }
  listeners.forEach((listener) => listener());
}

export function getPreference<T>(key: string, fallback: T): T {
  try {
    const preferences = JSON.parse(globalThis.localStorage.getItem(PREFS_KEY) ?? '{}') as Record<string, unknown>;
    return (key in preferences ? preferences[key] : fallback) as T;
  } catch {
    return fallback;
  }
}

export function setPreference(key: string, value: unknown) {
  try {
    const preferences = JSON.parse(globalThis.localStorage.getItem(PREFS_KEY) ?? '{}') as Record<string, unknown>;
    preferences[key] = value;
    globalThis.localStorage.setItem(PREFS_KEY, JSON.stringify(preferences));
  } catch {
    // Preferences remain available for this session even if storage is unavailable.
  }
  preferenceRevision += 1;
  listeners.forEach((listener) => listener());
}
