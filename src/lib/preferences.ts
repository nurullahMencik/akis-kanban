import { useSyncExternalStore } from "react";
import type { Locale } from "@/lib/i18n/messages";
import { LOCALE_STORAGE_KEY, THEME_STORAGE_KEY } from "./preferences-boot";

export type ThemePreference = "system" | "light" | "dark";

interface Preferences {
  theme: ThemePreference;
  locale: Locale;
}

const DEFAULTS: Preferences = { theme: "system", locale: "tr" };
const THEME_COLORS = { light: "#f3f2ee", dark: "#111316" } as const;

let current: Preferences | null = null;
const listeners = new Set<() => void>();

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private mode or blocked storage: the preference simply lasts for this visit.
  }
}

function snapshot(): Preferences {
  if (current) return current;
  if (typeof window === "undefined") return DEFAULTS;
  const theme = readStorage(THEME_STORAGE_KEY);
  const locale = readStorage(LOCALE_STORAGE_KEY);
  current = {
    theme: theme === "light" || theme === "dark" ? theme : "system",
    locale: locale === "en" ? "en" : "tr",
  };
  return current;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function update(patch: Partial<Preferences>) {
  current = { ...snapshot(), ...patch };
  for (const listener of listeners) listener();
}

/** Preferences live in localStorage; the server snapshot is always the default (Turkish, system theme). */
export function usePreferences(): Preferences {
  return useSyncExternalStore(subscribe, snapshot, () => DEFAULTS);
}

export function getPreferences(): Preferences {
  return snapshot();
}

export function resolveTheme(preference: ThemePreference): "light" | "dark" {
  if (preference !== "system") return preference;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(preference: ThemePreference) {
  const theme = resolveTheme(preference);
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[theme]);
}

export function setThemePreference(theme: ThemePreference) {
  writeStorage(THEME_STORAGE_KEY, theme);
  applyTheme(theme);
  update({ theme });
}

export function setLocale(locale: Locale) {
  writeStorage(LOCALE_STORAGE_KEY, locale);
  document.documentElement.lang = locale;
  update({ locale });
}
