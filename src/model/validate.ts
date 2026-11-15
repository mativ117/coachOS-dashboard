import { validateLogo } from "../files/logo";
import type { Action, Library, Play, State, Step } from "./types";

function fail(reason: string): never {
  throw new Error(`Données CoachOS invalides : ${reason}.`);
}
export function record(
  v: unknown,
  keys: string[],
  optional: string[] = [],
): asserts v is Record<string, unknown> {
  if (
    !v ||
    typeof v !== "object" ||
    Array.isArray(v) ||
    Object.getPrototypeOf(v) !== Object.prototype
  )
    fail("objet attendu");
  const o = v as Record<string, unknown>;
  if (
    keys.some((k) => !Object.hasOwn(o, k)) ||
    Object.keys(o).some((k) => ![...keys, ...optional].includes(k))
  )
    fail("champs inattendus ou manquants");
}
export function list(v: unknown, max = 1000): asserts v is unknown[] {
  if (!Array.isArray(v) || v.length > max) fail("…3331 tokens truncated…references.courtPreview, ["half", "full"]);
  return v as unknown as Library;
}
