import { useSyncExternalStore } from "react";
import english from "./en";
export type Locale = "fr" | "en";
const key = "coachos.language";
let locale: Locale = "fr";
try {
  if (localStorage.getItem(key) === "en") locale = "en";
} catch {
  /* Private storage may be unavailable. */
}
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export function setLocale(value: Locale) {
  locale = value;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* The choice still works for this session. */
  }
  document.documentElement.lang = value;
  listeners.forEach((listener) => listener());
}
export function useLocale() {
  return useSyncExternalStore(subscribe, () => locale);
}
const templates = Object.entries(english)
  .filter(([key]) => /\{\d+\}/.test(key))
  .map(([key, value]) => {
    const indexes: number[] = [];
    const pattern = key
      .split(/(\{\d+\})/)
      .map((part) => {
        if (/^\{\d+\}$/.test(part)) {
          indexes.push(Number(part.slice(1, -1)));
          return "(.+?)";
        }
        return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      })
      .join("");
    return { pattern: new RegExp("^" + pattern + "$"), value, indexes };
  });
function translateMessage(source: string) {
  const exact = (english as Record<string, string>)[source];
  if (exact !== undefined) return exact;
  for (const template of templates) {
    const match = template.pattern.exec(source);
    if (match)
      return template.value.replace(
        /\{(\d+)\}/g,
        (_, i: string) => match[template.indexes.indexOf(Number(i)) + 1],
      );
  }
  return source;
}
export function t(source: string, ...values: unknown[]): string {
  if (!source.trim()) return source;
  const clean = source.trim();
  const translated = locale === "en" ? translateMessage(clean) : clean;
  const result = translated.replace(/\{(\d+)\}/g, (_, index: string) =>
    String(values[Number(index)] ?? `{${index}}`),
  );
  return (
    source.slice(0, source.length - source.trimStart().length) +
    result +
    source.slice(source.trimEnd().length)
  );
}
