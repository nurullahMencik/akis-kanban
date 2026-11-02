import { enUS } from "date-fns/locale/en-US";
import { tr as trDateLocale } from "date-fns/locale/tr";
import { useMemo } from "react";
import { usePreferences } from "@/lib/preferences";
import { dictionaries, format, type Locale, type MessageKey } from "./messages";

export type Translate = (key: MessageKey, params?: Record<string, string | number>) => string;

export function createTranslator(locale: Locale): Translate {
  const messages = dictionaries[locale];
  return (key, params) => format(messages, locale, key, params);
}

export function useI18n() {
  const { locale } = usePreferences();
  return useMemo(
    () => ({
      locale,
      t: createTranslator(locale),
      dateLocale: locale === "tr" ? trDateLocale : enUS,
      numberLocale: locale === "tr" ? "tr-TR" : "en-US",
    }),
    [locale],
  );
}
