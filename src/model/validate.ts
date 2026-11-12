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
  if (!Array.isArray(v) || v.length > max) fail("liste hors limites");
}
export function text(v: unknown, max = 12000): asserts v is string {
  if (typeof v !== "string" || v.length > max) fail("texte hors limites");
}
function integer(v: unknown, min = 0, max = 1000000) {
  if (!Number.isInteger(v) || (v as number) < min || (v as number) > max)
    fail("entier hors limites");
}
function choice(v: unknown, choices: readonly unknown[]) {
  if (!choices.includes(v)) fail("valeur inconnue");
}
function id(v: unknown): asserts v is string {
  text(v, 160);
  if (!/^[a-zA-Z0-9:_-]+$/.test(v)) fail("identifiant");
}
export function point(v: unknown): asserts v is [number, number] {
  list(v, 2);
  if (
    v.length !== 2 ||
    v.some(
      (n) =>
        typeof n !== "number" || !Number.isFinite(n) || Math.abs(n) > 10000,
    )
  )
    fail("coordonnées hors limites");
}
function state(v: unknown, allowEmpty = false): asserts v is State {
  record(v, ["players", "ball"]);
  record(
    v.players,
    allowEmpty &&
      v.players &&
      typeof v.players === "object" &&
      Object.keys(v.players).length === 0
      ? []
      : ["1", "2", "3", "4", "5"],
  );
  Object.values(v.players).forEach(point);
  if (v.ball !== null) {
    if (!v.ball || typeof v.ball !== "object") fail("ballon");
    const b = v.ball as Record<string, unknown>;
    if (b.mode === "attached") {
      record(b, ["mode", "carrierId"]);
      choice(b.carrierId, ["1", "2", "3", "4", "5"]);
    } else {
      record(b, ["mode", "position"]);
      choice(b.mode, ["free"]);
      point(b.position);
    }
  }
}
function action(v: unknown): asserts v is Action {
  record(v, ["id", "kind", "geometry", "status"], ["actorId", "recipientId"]);
  id(v.id);
  choice(v.kind, ["run", "cut", "pass", "screen"]);
  choice(v.status, ["recorded", "optional", "unassigned"]);
  for (const k of ["actorId", "recipientId"])
    if (v[k] !== undefined) choice(v[k], ["1", "2", "3", "4", "5"]);
  record(v.geometry, ["kind", "points"]);
  choice(v.geometry.kind, ["line", "catmull-rom", "legacy-screen"]);
  list(v.geometry.points, 100);
  v.geometry.points.forEach(point);
  const points = v.geometry.points;
  if (
    v.geometry.kind === "legacy-screen"
      ? points.length !== 1 || v.kind !== "screen"
      : points.length < 2
  )
    fail("géométrie");
  if (v.geometry.kind === "line" && points.length !== 2) fail("segment");
  if (v.kind === "pass" && v.status === "recorded")
    fail("passe sans validation explicite");
}
function step(v: unknown): asserts v is Step {
  record(v, [
    "id",
    "title",
    "note",
    "beforeState",
    "afterState",
    "actions",
    "flags",
  ]);
  id(v.id);
  text(v.title, 300);
  text(v.note);
  state(v.beforeState);
  state(v.afterState);
  list(v.actions, 200);
  v.actions.forEach(action);
  list(v.flags, 30);
  v.flags.forEach((f) => text(f, 300));
}
function unique(ids: string[]) {
  if (new Set(ids).size !== ids.length) fail("identifiants dupliqués");
}
function iso(v: unknown) {
  text(v, 40);
  if (
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v) ||
    !Number.isFinite(Date.parse(v))
  )
    fail("date");
}
function sameState(a: State, b: State) {
  const ids = Object.keys(a.players);
  if (
    ids.length !== Object.keys(b.players).length ||
    ids.some(
      (id) =>
        !b.players[id] ||
        a.players[id][0] !== b.players[id][0] ||
        a.players[id][1] !== b.players[id][1],
    )
  )
    return false;
  if (!a.ball || !b.ball) return a.ball === b.ball;
  if (a.ball.mode === "attached" && b.ball.mode === "attached")
    return a.ball.carrierId === b.ball.carrierId;
  return (
    a.ball.mode === "free" &&
    b.ball.mode === "free" &&
    a.ball.position[0] === b.ball.position[0] &&
    a.ball.position[1] === b.ball.position[1]
  );
}
function continuity(steps: Step[], initial: State) {
  let previous = initial;
  for (const s of steps) {
    if (!sameState(s.beforeState, previous)) fail("état de départ incohérent");
    previous = s.afterState;
  }
}
export function validatePlay(v: unknown): Play {
  record(v, [
    "id",
    "schemaVersion",
    "revision",
    "createdAt",
    "updatedAt",
    "name",
    "status",
    "court",
    "initialState",
    "commonSteps",
    "branches",
    "metadata",
  ]);
  id(v.id);
  choice(v.schemaVersion, [1]);
  integer(v.revision, 1);
  iso(v.createdAt);
  iso(v.updatedAt);
  text(v.name, 300);
  choice(v.status, ["imported", "needs-review", "draft"]);
  record(v.court, ["kind", "coordinateSpace", "dimensionsConfirmed"]);
  choice(v.court.kind, ["half", "full"]);
  choice(v.court.coordinateSpace, ["legacy-750x655", "stack-raw"]);
  choice(v.court.dimensionsConfirmed, [true, false]);
  if (v.court.coordinateSpace === "stack-raw" && v.court.dimensionsConfirmed)
    fail("dimensions Stack non confirmées");
  state(v.initialState, v.status === "draft");
  list(v.commonSteps, 500);
  v.commonSteps.forEach(step);
  list(v.branches, 50);
  const common = v.commonSteps as Step[];
  const allSteps: Step[] = [...common];
  continuity(common, v.initialState as State);
  for (const b of v.branches) {
    record(b, ["id", "name", "forkStepId", "steps"]);
    id(b.id);
    text(b.name, 300);
    id(b.forkStepId);
    const fork = common.find((s) => s.id === b.forkStepId);
    if (!fork) fail("point de branchement absent");
    list(b.steps, 500);
    b.steps.forEach(step);
    continuity(b.steps as Step[], fork.afterState);
    allSteps.push(...(b.steps as Step[]));
  }
  unique([
    v.id,
    ...v.branches.map((b) => (b as { id: string }).id),
    ...allSteps.map((s) => s.id),
    ...allSteps.flatMap((s) => s.actions.map((a) => a.id)),
  ]);
  record(v.metadata, ["description", "guidance", "category", "report"]);
  text(v.metadata.description, 1000);
  text(v.metadata.guidance);
  text(v.metadata.category, 300);
  const report = v.metadata.report;
  record(report, ["source", "steps", "branches", "actions", "issues"]);
  choice(report.source, ["historical", "stack", "draft"]);
  integer(report.steps);
  integer(report.branches);
  integer(report.actions);
  list(report.issues, 100);
  report.issues.forEach((s) => text(s, 1000));
  if (
    report.steps !== allSteps.length ||
    report.branches !== v.branches.length ||
    report.actions !== allSteps.reduce((n, s) => n + s.actions.length, 0)
  )
    fail("rapport incohérent");
  return v as unknown as Play;
}
/** Taille et profondeur vérifiées avant la validation de schéma ; aucune interprétation HTML. */
export function parseBoundedJson(raw: string): unknown {
  if (new TextEncoder().encode(raw).length > 4_000_000)
    fail("fichier trop volumineux");
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    fail("JSON illisible");
  }
  let count = 0;
  const walk = (n: unknown, depth: number) => {
    if (depth > 30 || ++count > 150000) fail("structure trop complexe");
    if (n && typeof n === "object")
      for (const [key, value] of Object.entries(n)) {
        if (["__proto__", "constructor", "prototype"].includes(key))
          fail("clé interdite");
        walk(value, depth + 1);
      }
  };
  walk(v, 0);
  return v;
}
export function validateLibrary(v: unknown): Library {
  record(v, [
    "librarySchemaVersion",
    "revision",
    "plays",
    "collections",
    "preferences",
  ]);
  choice(v.librarySchemaVersion, [1]);
  integer(v.revision, 1);
  list(v.plays, 1000);
  const plays = v.plays.map(validatePlay);
  unique(
    plays.flatMap((p) => [
      p.id,
      ...p.branches.map((b) => b.id),
      ...[...p.commonSteps, ...p.branches.flatMap((b) => b.steps)].flatMap(
        (s) => [s.id, ...s.actions.map((a) => a.id)],
      ),
    ]),
  );
  list(v.collections, 100);
  for (const c of v.collections) {
    record(c, ["id", "name", "playIds"]);
    id(c.id);
    text(c.name, 300);
    list(c.playIds, 1000);
    c.playIds.forEach(id);
    unique(c.playIds as string[]);
    if (c.playIds.some((ref) => !plays.some((p) => p.id === ref)))
      fail("référence de collection absente");
  }
  unique(v.collections.map((c) => (c as { id: string }).id));
  record(v.preferences, ["courtPreview"]);
  choice(v.preferences.courtPreview, ["half", "full"]);
  return v as unknown as Library;
}
