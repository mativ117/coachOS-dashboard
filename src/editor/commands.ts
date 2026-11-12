import type {
  Action,
  BallState,
  Play,
  Point,
  State,
  Step,
} from "../model/types";
import { validatePlay } from "../model/validate";
const copy = <T>(value: T): T => structuredClone(value);
const key = (prefix = "edit") => `${prefix}-${crypto.randomUUID()}`;
const equalPoint = (a: Point | undefined, b: Point | undefined) =>
  !!a && !!b && a[0] === b[0] && a[1] === b[1];
const equalBall = (a: BallState, b: BallState) =>
  JSON.stringify(a) === JSON.stringify(b);
export const allSteps = (p: Play) => [
  ...p.commonSteps,
  ...p.branches.flatMap((b) => b.steps),
];
function getStep(p: Play, id: string) {
  const s = allSteps(p).find((s) => s.id === id);
  if (!s) throw new Error("Étape introuvable.");
  return s;
}

/** Héritage des positions qui ne changeaient pas ; les destinations explicites restent intactes. */
function rebase(steps: Step[], initial: State) {
  let previous = copy(initial);
  for (const s of steps) {
    const oldBefore = copy(s.beforeState),
      oldAfter = copy(s.afterState);
    s.beforeState = copy(previous);
    for (const id of Object.keys(previous.players))
      if (equalPoint(oldBefore.players[id], oldAfter.players[id]))
        s.afterState.players[id] = copy(previous.players[id]);
    if (s.afterState.defenders || previous.defenders) {
      s.afterState.defenders ??= {};
      for (const id of Object.keys(oldBefore.defenders ?? {}))
        if (
          !previous.defenders?.[id] &&
          equalPoint(oldBefore.defenders?.[id], oldAfter.defenders?.[id])
        )
          delete s.afterState.defenders[id];
      for (const id of Object.keys(previous.defenders ?? {}))
        if (
          !oldAfter.defenders?.[id] ||
          equalPoint(oldBefore.defenders?.[id], oldAfter.defenders?.[id])
        )
          s.afterState.defenders[id] = copy(previous.defenders![id]);
    }
    if (equalBall(oldBefore.ball, oldAfter.ball))
      s.afterState.ball = copy(previous.ball);
    for (const a of s.actions) {
      const pts = a.geometry.points;
      if (a.kind === "pass" && a.actorId && a.recipientId) {
        a.geometry.points = [
          copy(s.afterState.players[a.actorId]),
          copy(s.afterState.players[a.recipientId]),
        ];
      } else if (a.geometry.kind === "legacy-screen" && a.actorId)
        a.geometry.points = [copy(s.afterState.players[a.actorId])];
      else if (a.actorId && a.kind !== "annotation") {
        if (equalPoint(pts[0], oldBefore.players[a.actorId]))
          pts[0] = copy(s.beforeState.players[a.actorId]);
        if (equalPoint(pts.at(-1), oldAfter.players[a.actorId]))
          pts[pts.length - 1] = copy(s.afterState.players[a.actorId]);
      }
      if (a.kind === "pass" && a.status === "confirmed" && a.recipientId)
        s.afterState.ball = { mode: "attached", carrierId: a.recipientId };
    }
    previous = copy(s.afterState);
  }
}
export function finish(p: Play): Play {
  p.schemaVersion = 2;
  p.revision++;
  p.updatedAt = new Date().toISOString();
  p.metadata.originalReport ??= copy(p.metadata.report);
  rebase(p.commonSteps, p.initialState);
  for (const b of p.branches) {
    const fork = p.commonSteps.find((s) => s.id === b.forkStepId);
    if (!fork) throw new Error("Point de branchement introuvable.");
    rebase(b.steps, fork.afterState);
  }
  const steps = allSteps(p);
  p.metadata.report = {
    ...p.metadata.report,
    steps: steps.length,
    branches: p.branches.length,
    actions: steps.reduce((n, s) => n + s.actions.length, 0),
  };
  p.status =
    p.court.coordinateSpace === "stack-raw"
      ? "needs-review"
      : steps.length
        ? "edited"
        : "draft";
  return validatePlay(p);
}
export function changeStep(
  play: Play,
  id: string,
  change: (step: Step) => void,
): Play {
  const p = copy(play);
  change(getStep(p, id));
  return finish(p);
}
export function changePlay(play: Play, change: (p: Play) => void): Play {
  const p = copy(play);
  change(p);
  return finish(p);
}
export function movePlayer(
  play: Play,
  stepId: string,
  id: string,
  point: Point,
  defender = false,
): Play {
  return changeStep(play, stepId, (s) => {
    const positions = defender
      ? (s.afterState.defenders ??= {})
      : s.afterState.players;
    const old = positions[id];
    positions[id] = copy(point);
    if (!defender)
      for (const a of s.actions)
        if (
          a.actorId === id &&
          a.kind !== "pass" &&
          a.kind !== "annotation" &&
          equalPoint(a.geometry.points.at(-1), old)
        )
          a.geometry.points[a.geometry.points.length - 1] = copy(point);
  });
}
export function setBall(
  play: Play,
  stepId: string,
  ball: BallState,
  atStart = false,
): Play {
  const p = copy(play);
  const commonIndex = p.commonSteps.findIndex((s) => s.id === stepId);
  let target: State;
  if (!atStart) target = getStep(p, stepId).afterState;
  else if (commonIndex === 0) target = p.initialState;
  else if (commonIndex > 0) target = p.commonSteps[commonIndex - 1].afterState;
  else {
    const b = p.branches.find((b) => b.steps.some((s) => s.id === stepId))!;
    const i = b.steps.findIndex((s) => s.id === stepId);
    target =
      i === 0
        ? p.commonSteps.find((s) => s.id === b.forkStepId)!.afterState
        : b.steps[i - 1].afterState;
  }
  const owner = allSteps(p).find((s) => s.afterState === target);
  const confirmed = owner?.actions.find((a) => a.status === "confirmed");
  if (
    confirmed &&
    (ball?.mode !== "attached" || ball.carrierId !== confirmed.recipientId)
  )
    throw new Error(
      "Désactivez d’abord la passe exécutée qui impose cette possession.",
    );
  target.ball = copy(ball);
  return finish(p);
}
export function initialize(play: Play): Play {
  if (play.commonSteps.length)
    throw new Error("Ce play possède déjà des étapes.");
  const p = copy(play);
  p.initialState = {
    players: {
      1: [375, 440],
      2: [650, 110],
      3: [491, 310],
      4: [100, 110],
      5: [259, 310],
    },
    ball: null,
  };
  p.commonSteps = [blankStep(p.initialState, "Départ")];
  return finish(p);
}
function blankStep(state: State, title = "Nouvelle étape"): Step {
  return {
    id: key("step"),
    title,
    note: "",
    beforeState: copy(state),
    afterState: copy(state),
    actions: [],
    flags: [],
  };
}
export function addStep(
  play: Play,
  branchId: string,
  afterId: string,
): { play: Play; stepId: string } {
  const p = copy(play);
  const branch = p.branches.find((b) => b.id === branchId);
  const steps = branch ? branch.steps : p.commonSteps;
  const index = steps.findIndex((s) => s.id === afterId);
  const position = index + 1;
  const state =
    index >= 0
      ? steps[index].afterState
      : branch
        ? p.commonSteps.find((s) => s.id === branch.forkStepId)!.afterState
        : p.initialState;
  const step = blankStep(state);
  steps.splice(position, 0, step);
  if (!branch)
    for (const b of p.branches)
      if (b.forkStepId === afterId) b.forkStepId = step.id;
  return { play: finish(p), stepId: step.id };
}
export function deleteStep(play: Play, stepId: string): Play {
  const p = copy(play);
  const ci = p.commonSteps.findIndex((s) => s.id === stepId);
  if (ci >= 0) {
    if (p.commonSteps.length === 1)
      throw new Error("Conservez au moins une étape commune.");
    for (const b of p.branches)
      if (b.forkStepId === stepId) {
        if (ci === 0)
          throw new Error("Une lecture dépend de cette première étape.");
        b.forkStepId = p.commonSteps[ci - 1].id;
      }
    p.commonSteps.splice(ci, 1);
  } else {
    const b = p.branches.find((b) => b.steps.some((s) => s.id === stepId));
    if (!b) throw new Error("Étape absente.");
    b.steps = b.steps.filter((s) => s.id !== stepId);
  }
  return finish(p);
}
export function addBranch(
  play: Play,
  name: string,
  forkStepId: string,
): { play: Play; branchId: string; stepId: string } {
  const p = copy(play);
  const fork = p.commonSteps.find((s) => s.id === forkStepId);
  if (!fork) throw new Error("Choisissez une étape commune.");
  if (!name.trim()) throw new Error("Nommez la lecture.");
  const id = key("branch");
  const step = blankStep(fork.afterState, "Départ de la lecture");
  p.branches.push({ id, name: name.trim(), forkStepId, steps: [step] });
  return { play: finish(p), branchId: id, stepId: step.id };
}
export function addAction(
  play: Play,
  stepId: string,
  kind: Action["kind"],
  points: Point[],
  actorId?: string,
  recipientId?: string,
  curved = false,
  note?: string,
): { play: Play; actionId: string } {
  const id = key("action");
  const p = changeStep(play, stepId, (s) => {
    if (
      kind === "pass" &&
      (!actorId || !recipientId || actorId === recipientId)
    )
      throw new Error("Sélectionnez deux joueurs distincts pour la passe.");
    const a: Action = {
      id,
      kind,
      geometry: {
        kind: kind === "annotation" ? "text" : curved ? "catmull-rom" : "line",
        points: copy(points),
      },
      status:
        kind === "pass"
          ? "optional"
          : actorId || kind === "annotation"
            ? "recorded"
            : "unassigned",
    };
    if (actorId) a.actorId = actorId;
    if (recipientId) a.recipientId = recipientId;
    if (note !== undefined) a.text = note;
    s.actions.push(a);
    if (actorId && ["run", "cut", "screen"].includes(kind))
      s.afterState.players[actorId] = copy(points.at(-1)!);
  });
  return { play: p, actionId: id };
}
export function editAction(
  play: Play,
  stepId: string,
  actionId: string,
  change: (a: Action, s: Step) => void,
): Play {
  return changeStep(play, stepId, (s) => {
    const a = s.actions.find((a) => a.id === actionId);
    if (!a) throw new Error("Tracé absent.");
    change(a, s);
  });
}
export function editPoint(
  play: Play,
  stepId: string,
  actionId: string,
  index: number,
  point: Point,
): Play {
  return editAction(play, stepId, actionId, (a, s) => {
    a.geometry.points[index] = copy(point);
    if (
      index === a.geometry.points.length - 1 &&
      a.actorId &&
      ["run", "cut", "screen"].includes(a.kind)
    )
      s.afterState.players[a.actorId] = copy(point);
  });
}
export function confirmPass(
  play: Play,
  stepId: string,
  actionId: string,
  confirmed: boolean,
): Play {
  return editAction(play, stepId, actionId, (a, s) => {
    if (a.kind !== "pass" || !a.actorId || !a.recipientId)
      throw new Error("Associez d’abord le passeur et le destinataire.");
    if (confirmed) {
      if (
        s.beforeState.ball?.mode !== "attached" ||
        s.beforeState.ball.carrierId !== a.actorId
      )
        throw new Error(
          `Définissez le joueur ${a.actorId} comme porteur au départ dans Ballon.`,
        );
      if (
        s.actions.some(
          (other) => other.id !== a.id && other.status === "confirmed",
        )
      )
        throw new Error(
          "Une passe exécutée par étape ; ajoutez une étape pour la suivante.",
        );
      a.ballBeforeConfirmation = copy(s.afterState.ball);
      a.status = "confirmed";
      s.afterState.ball = { mode: "attached", carrierId: a.recipientId };
    } else {
      a.status = "optional";
      if (a.ballBeforeConfirmation !== undefined)
        s.afterState.ball = copy(a.ballBeforeConfirmation);
      delete a.ballBeforeConfirmation;
    }
  });
}
export function createPlay(name: string): Play {
  if (!name.trim()) throw new Error("Nommez le système.");
  const now = new Date().toISOString();
  return validatePlay({
    id: key("play"),
    schemaVersion: 2,
    revision: 1,
    createdAt: now,
    updatedAt: now,
    name: name.trim(),
    status: "draft",
    court: {
      kind: "half",
      coordinateSpace: "legacy-750x655",
      dimensionsConfirmed: true,
    },
    initialState: { players: {}, ball: null },
    commonSteps: [],
    branches: [],
    metadata: {
      description: "Votre système",
      guidance: "",
      category: "Demi-terrain",
      report: {
        source: "draft",
        steps: 0,
        branches: 0,
        actions: 0,
        issues: [],
      },
    },
  });
}
