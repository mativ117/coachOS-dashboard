import type { Action, Library, Play, Point, State, Step } from "../model/types";
import {
  list,
  parseBoundedJson,
  point,
  record,
  text,
  validateLibrary,
} from "../model/validate";
import { catalog } from "../library/catalog";
import { parseHistoricalData } from "./legacy-parser";

type LegacyAction =
  | { t: "m" | "c"; id: number; via: Point[] }
  | { t: "p"; a: number; b: number }
  | { t: "s"; id: number };
interface LegacyStep {
  title: string;
  desc: string;
  delta?: Record<string, Point>;
  acts?: LegacyAction[];
  ball?: number;
}
interface Historical {
  name: string;
  sub: string;
  tip: string;
  ball: number;
  start: Record<string, Point>;
  steps?: LegacyStep[];
  base?: LegacyStep[];
  variants?: Record<string, { label: string; steps: LegacyStep[] }>;
}
function actor(n: unknown): asserts n is number {
  if (!Number.isInteger(n) || (n as number) < 1 || (n as number) > 5)
    throw new Error("Joueur historique invalide.");
}
function legacyStep(v: unknown): asserts v is LegacyStep {
  record(v, ["title", "desc"], ["delta", "acts", "ball"]);
  text(v.title, 300);
  text(v.desc);
  if (v.delta !== undefined) {
    record(v.delta, [], ["1", "2", "3", "4", "5"]);
    Object.values(v.delta).forEach(point);
  }
  if (v.ball !== undefined) actor(v.ball);
  if (v.acts !== undefined) {
    list(v.acts, 200);
    for (const a of v.acts) {
      if (!a || typeof a !== "object") throw new Error("Action invalide.");
      const t = (a as { t: unknown }).t;
      if (t === "m" || t === "c") {
        record(a, ["t", "id", "via"]);
        actor(a.id);
        list(a.via, 99);
        a.via.forEach(point);
        if (!a.via.length) throw new Error("Trajet vide.");
      } else if (t === "p") {
        record(a, ["t", "a", "b"]);
        actor(a.a);
        actor(a.b);
      } else {
        record(a, ["t", "id"]);
        if (a.t !== "s") throw new Error("Action inconnue.");
        actor(a.id);
      }
    }
  }
}
function historical(v: unknown): Historical[] {
  list(v, 5);
  if (v.length !== 5) throw new Error("Cinq plays historiques attendus.");
  for (const p of v) {
    record(
      p,
      ["name", "sub", "ball", "start", "tip"],
      ["steps", "base", "variants"],
    );
    text(p.name, 300);
    text(p.sub, 1000);
    text(p.tip);
    actor(p.ball);
    record(p.start, ["1", "2", "3", "4", "5"]);
    Object.values(p.start).forEach(point);
    if (p.steps !== undefined) {
      if (p.base !== undefined || p.variants !== undefined)
        throw new Error("Timeline ambiguë.");
      list(p.steps, 500);
      p.steps.forEach(legacyStep);
    } else {
      list(p.base, 500);
      p.base.forEach(legacyStep);
      if (!p.base.length) throw new Error("Tronc vide.");
      if (
        !p.variants ||
        typeof p.variants !== "object" ||
        Array.isArray(p.variants)
      )
        throw new Error("Lectures absentes.");
      for (const [key, b] of Object.entries(p.variants)) {
        if (!/^[a-z-]+$/.test(key)) throw new Error("Lecture invalide.");
        record(b, ["label", "steps"]);
        text(b.label, 300);
        list(b.steps, 500);
        b.steps.forEach(legacyStep);
      }
    }
  }
  return v as unknown as Historical[];
}
const clone = <T>(v: T): T => structuredClone(v);
function historicalPlay(source: Historical, index: number, now: string): Play {
  const card = catalog[index];
  if (card.name !== source.name)
    throw new Error("Inventaire historique modifié.");
  const initial: State = {
    players: clone(source.start),
    ball: { mode: "attached", carrierId: String(source.ball) },
  };
  function convert(
    steps: LegacyStep[],
    prefix: string,
    from: State,
    offset = 0,
  ): Step[] {
    let previous = clone(from);
    return steps.map((s, i) => {
      const before = clone(previous);
      const after = clone(before);
      if (i + offset > 0) Object.assign(after.players, clone(s.delta ?? {}));
      // Le lecteur historique utilise le marqueur explicite de l'étape ou le porteur initial.
      after.ball = {
        mode: "attached",
        carrierId: String(s.ball ?? source.ball),
      };
      const stepId = `${card.id}:step:${prefix}:${i}`;
      const actions: Action[] = (s.acts ?? []).map((a, j) => {
        const id = `${stepId}:action:${j}`;
        if (a.t === "m" || a.t === "c")
          return {
            id,
            kind: a.t === "m" ? "run" : "cut",
            actorId: String(a.id),
            geometry: {
              kind: "catmull-rom",
              points: [clone(before.players[String(a.id)]), ...clone(a.via)],
            },
            status: "recorded",
          };
        if (a.t === "p")
          return {
            id,
            kind: "pass",
            actorId: String(a.a),
            recipientId: String(a.b),
            geometry: {
              kind: "line",
              points: [
                clone(after.players[String(a.a)]),
                clone(after.players[String(a.b)]),
              ],
            },
            status: "optional",
          };
        return {
          id,
          kind: "screen",
          actorId: String(a.id),
          geometry: {
            kind: "legacy-screen",
            points: [clone(after.players[String(a.id)])],
          },
          status: "recorded",
        };
      });
      const flags: string[] = [];
      if (actions.some((a) => a.kind === "pass"))
        flags.push("Passes dessinées : options, aucune exécution déduite.");
      if (
        actions.some(
          (a) =>
            a.kind === "screen" &&
            !actions.some(
              (m) =>
                m.kind !== "screen" &&
                m.actorId === a.actorId &&
                (m.kind === "run" || m.kind === "cut"),
            ),
        )
      )
        flags.push("Écran placé sans trajectoire du poseur dans cette étape.");
      previous = after;
      return {
        id: stepId,
        title: s.title,
        note: s.desc,
        beforeState: before,
        afterState: after,
        actions,
        flags,
      };
    });
  }
  const common = convert(source.steps ?? source.base ?? [], "common", initial);
  const branches = Object.entries(source.variants ?? {}).map(([key, b]) => ({
    id: `${card.id}:branch:${key}`,
    name: b.label,
    forkStepId: common.at(-1)!.id,
    steps: convert(b.steps, key, common.at(-1)!.afterState, common.length),
  }));
  const all = [...common, ...branches.flatMap((b) => b.steps)];
  const issues = [...new Set(all.flatMap((s) => s.flags))];
  return {
    id: card.id,
    schemaVersion: 1,
    revision: 1,
    createdAt: now,
    updatedAt: now,
    name: source.name,
    status: "imported",
    court: {
      kind: "half",
      coordinateSpace: "legacy-750x655",
      dimensionsConfirmed: true,
    },
    initialState: initial,
    commonSteps: common,
    branches,
    metadata: {
      description: source.sub,
      guidance: source.tip,
      category: card.category,
      report: {
        source: "historical",
        steps: all.length,
        branches: branches.length,
        actions: all.reduce((n, s) => n + s.actions.length, 0),
        issues: [
          ...issues,
          "Timings tactiques non fournis ; lecture statique uniquement.",
        ],
      },
    },
  };
}
function stackPlay(raw: string, now: string): Play {
  const source = parseBoundedJson(raw);
  record(source, ["format", "name", "court", "steps"]);
  if (source.format !== "CoachOS-play-v2" || source.court !== "half-court")
    throw new Error("Format Stack inconnu.");
  text(source.name, 300);
  list(source.steps, 500);
  let previous: State | undefined;
  const steps: Step[] = source.steps.map((s, i) => {
    record(s, ["players", "lines", "note"]);
    text(s.note);
    list(s.players, 5);
    if (s.players.length !== 5) throw new Error("Cinq joueurs Stack attendus.");
    const players: Record<string, Point> = {};
    for (const p of s.players) {
      record(p, ["n", "x", "y"]);
      actor(p.n);
      point([p.x, p.y]);
      if (players[String(p.n)]) throw new Error("Joueur Stack dupliqué.");
      players[String(p.n)] = [p.x as number, p.y as number];
    }
    const after: State = { players, ball: null };
    const id = `stack:step:${i}`;
    list(s.lines, 200);
    const actions: Action[] = s.lines.map((a, j) => {
      record(a, ["type", "a", "b"]);
      if (!["run", "pass", "screen"].includes(a.type as string))
        throw new Error("Tracé Stack inconnu.");
      record(a.a, ["x", "y"]);
      record(a.b, ["x", "y"]);
      point([a.a.x, a.a.y]);
      point([a.b.x, a.b.y]);
      return {
        id: `${id}:action:${j}`,
        kind: a.type as Action["kind"],
        geometry: {
          kind: "line",
          points: [
            [a.a.x as number, a.a.y as number],
            [a.b.x as number, a.b.y as number],
          ],
        },
        status: "unassigned",
      };
    });
    const step: Step = {
      id,
      title: `Étape ${i + 1}`,
      note: s.note,
      beforeState: clone(previous ?? after),
      afterState: after,
      actions,
      flags: [
        "Acteurs et porteur non renseignés.",
        "Dimensions du repère source non confirmées.",
      ],
    };
    previous = after;
    return step;
  });
  if (
    steps.length !== 6 ||
    steps.reduce((n, s) => n + s.actions.length, 0) !== 24
  )
    throw new Error("Inventaire Stack inattendu.");
  return {
    id: "stack",
    schemaVersion: 1,
    revision: 1,
    createdAt: now,
    updatedAt: now,
    name: source.name,
    status: "needs-review",
    court: {
      kind: "half",
      coordinateSpace: "stack-raw",
      dimensionsConfirmed: false,
    },
    initialState: clone(steps[0].afterState),
    commonSteps: steps,
    branches: [],
    metadata: {
      description: catalog[5].description,
      guidance: "",
      category: catalog[5].category,
      report: {
        source: "stack",
        steps: 6,
        branches: 0,
        actions: 24,
        issues: [
          "24 tracés libres : association aux joueurs à confirmer.",
          "Porteur, dimensions du terrain et timings non fournis.",
          "Aucune branche déduite des notes.",
        ],
      },
    },
  };
}
export function migrateSources(
  html: string,
  stack: string,
  now = new Date().toISOString(),
): Library {
  const plays = historical(parseHistoricalData(html)).map((p, i) =>
    historicalPlay(p, i, now),
  );
  plays.push(stackPlay(stack, now));
  for (const card of catalog.slice(6))
    plays.push({
      id: card.id,
      schemaVersion: 1,
      revision: 1,
      createdAt: now,
      updatedAt: now,
      name: card.name,
      status: "draft",
      court: {
        kind: "half",
        coordinateSpace: "legacy-750x655",
        dimensionsConfirmed: true,
      },
      initialState: {
        players: {},
        ball: null,
      },
      commonSteps: [],
      branches: [],
      metadata: {
        description: card.description,
        guidance: "",
        category: card.category,
        report: {
          source: "draft",
          steps: 0,
          branches: 0,
          actions: 0,
          issues: ["Brouillon nommé, sans trajectoire validée."],
        },
      },
    });
  return validateLibrary({
    librarySchemaVersion: 1,
    revision: 1,
    plays,
    collections: [
      {
        id: "owls",
        name: "Playbook OWLS",
        playIds: plays.slice(0, 5).map((p) => p.id),
      },
      {
        id: "to-confirm",
        name: "À confirmer",
        playIds: ["stack", "baseline", "losange"],
      },
    ],
    preferences: { courtPreview: "half" },
  });
}
