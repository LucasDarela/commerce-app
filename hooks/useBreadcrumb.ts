import { useSyncExternalStore } from "react";

let overrides: Record<string, string> = {};
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => overrides;

export const setBreadcrumbOverride = (segment: string, label: string) => {
  if (overrides[segment] === label) return; // Prevent unnecessary updates
  overrides = { ...overrides, [segment]: label };
  listeners.forEach((l) => l());
};

export const removeBreadcrumbOverride = (segment: string) => {
  if (!(segment in overrides)) return;
  const newOverrides = { ...overrides };
  delete newOverrides[segment];
  overrides = newOverrides;
  listeners.forEach((l) => l());
};

export const useBreadcrumbStore = () => {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
};
