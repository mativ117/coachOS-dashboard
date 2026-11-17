import type { Library, Play } from "../model/types";
import { validateLibrary, validatePlay } from "../model/validate";
import type { Incoming } from "./formats";
export type Choice = "cancel" | "replace" | "copy";
export function entityIds(p: Play): string[] {
  return [
    p.id,
    ...p.branches.map((b) => b.id),
    ...[...p.commonSteps, ...p.branches.flatMap((b) => b.steps)].flatMap(
      (s) => [s.id, ...s.actions.map((a) => a.id)],
    ),
  ];
}
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
export function importRows(current: Library, incoming: Incoming) {
  const plays =
    incoming.kind === "play" ? [incoming.play] : incoming.library.plays;
  return plays.map((play) => {
    const existing = current.plays.find((p) => p.id === play.id);
    const otherIds = new Set(
      current.plays.filter((p) => p.id !== play.id).flatMap(entityIds),
    );
    const internalCollision = entityIds(play).some((id) => otherIds.has(id));
    return {
      play,
      existing,
      internalCollision,
      status: existing
        ? stable(existing) === stable(play)
          ? "identical"
          : "conflict"
        : internalCollision
          ? "conflict"
          : "new",
    };
  });
}
export function duplicatePlay(
  play: Play,
  name = `${play.name.slice(0, 285)} (copie)`,
): Play {
  const p = structuredClone(play);
  const ids = new Map(
    entityIds(p).map((id) => [id, `copy-${crypto.randomUUID()}`]),
  );
  p.id = ids.get(p.id)!;
  for (const b of p.branches) {
    b.id = ids.get(b.id)!;
    b.forkStepId = ids.get(b.forkStepId)!;
  }
  for (const s of [...p.commonSteps, ...p.branches.flatMap((b) => b.steps)]) {
    s.id = ids.get(s.id)!;
    for (const a of s.actions) a.id = ids.get(a.id)!;
  }
  p.name = name;
  p.revision = 1;
  p.createdAt = p.updatedAt = new Date().toISOString();
  return validatePlay(p);
}
export function buildImport(
  current: Library,
  incoming: Incoming,
  choices: Record<string, Choice>,
  mode: "merge" | "restore" = "merge",
  settings = false,
): Library {
  validateLibrary(current);
  if (mode === "restore") {
    if (incoming.kind !== "backup")
      throw new Error("Une sauvegarde complète est requise.");
    return validateLibrary({
      ...structuredClone(incoming.library),
      revision: current.revision + 1,
    });
  }
  const next = structuredClone(current);
  const mapping = new Map<string, string>();
  for (const row of importRows(current, incoming)) {
    const { play, status, internalCollision } = row;
    if (status === "identical") {
      if (next.examplePlayIds)
        next.examplePlayIds = next.examplePlayIds.filter(
          (id) => id !== play.id,
        );
      mapping.set(play.id, play.id);
      continue;
    }
    const choice = status === "conflict" ? choices[play.id] : "replace";
    if (!choice || choice === "cancel")
      throw new Error(
        "Choisissez Remplacer ou Conserver les deux, ou annulez l’import.",
      );
    if (internalCollision && choice !== "copy")
      throw new Error(
        "Des identifiants internes existent déjà : conservez une copie.",
      );
    const imported =
      choice === "copy" ? duplicatePlay(play) : structuredClone(play);
    if (choice !== "copy" && next.examplePlayIds)
      next.examplePlayIds = next.examplePlayIds.filter((id) => id !== play.id);
    mapping.set(play.id, imported.id);
    const index = next.plays.findIndex((p) => p.id === imported.id);
    if (index < 0) next.plays.push(imported);
    else next.plays[index] = imported;
  }
  if (incoming.kind === "backup") {
    for (const c of incoming.library.collections) {
      const imported = {
        ...structuredClone(c),
        playIds: c.playIds.map((id) => mapping.get(id)!),
      };
      const existing = next.collections.find((x) => x.id === c.id);
      if (existing && existing.name === c.name)
        existing.playIds = [
          ...new Set([...existing.playIds, ...imported.playIds]),
        ];
      else {
        if (existing) imported.id = `collection-${crypto.randomUUID()}`;
        next.collections.push(imported);
      }
    }
    if (settings) {
      next.preferences = structuredClone(incoming.library.preferences);
      if (incoming.library.profile)
        next.profile = structuredClone(incoming.library.profile);
    }
  }
  if (
    next.profile ||
    Object.keys(next.preferences).some((k) => k !== "courtPreview")
  )
    next.librarySchemaVersion = next.librarySchemaVersion === 3 ? 3 : 2;
  next.revision = current.revision + 1;
  return validateLibrary(next);
}
export function duplicateInLibrary(library: Library, playId: string): Library {
  const play = library.plays.find((p) => p.id === playId);
  if (!play) throw new Error("Système absent.");
  const copied = duplicatePlay(play);
  return validateLibrary({
    ...library,
    revision: library.revision + 1,
    plays: [...library.plays, copied],
    collections: library.collections.map((c) =>
      c.playIds.includes(playId)
        ? { ...c, playIds: [...c.playIds, copied.id] }
        : c,
    ),
  });
}
