import type { Action, BallState, Point, State, Step } from "../model/types";
import { equalPoint, route } from "./geometry";
export const DEFAULT_DURATION = 1400;
interface Track {
  action: Action;
  start: number;
  end: number;
  path: ReturnType<typeof route>;
}
export interface StepPlan {
  step: Step;
  duration: number;
  tracks: Track[];
  issues: string[];
  animated: boolean;
  raw: boolean;
}
const sameBall = (a: BallState, b: BallState) =>
  a?.mode === "attached" && b?.mode === "attached"
    ? a.carrierId === b.carrierId
    : a?.mode === "free" && b?.mode === "free"
      ? equalPoint(a.position, b.position)
      : a === b;
export function playerAt(
  plan: Pick<StepPlan, "tracks" | "step">,
  id: string,
  time: number,
): Point {
  let position = plan.step.beforeState.players[id];
  for (const track of plan.tracks
    .filter((t) => t.action.actorId === id && t.action.kind !== "pass")
    .sort((a, b) => a.start - b.start)) {
    if (time < track.start) break;
    position = track.path.at((time - track.start) / (track.end - track.start));
  }
  return [...position];
}
export function compileStep(step: Step, raw = false): StepPlan {
  const issues: string[] = [];
  const add = (issue: string) => {
    if (!issues.includes(issue)) issues.push(issue);
  };
  const moves = step.actions.filter(
    (a) =>
      ["run", "cut", "screen"].includes(a.kind) &&
      a.geometry.kind !== "legacy-screen",
  );
  for (const a of step.actions)
    if (a.status === "unassigned" && a.kind !== "annotation")
      add("Associer les tracés à leurs acteurs avant d’animer.");
  for (const a of moves)
    if (!a.actorId) add("Un déplacement ne précise pas son acteur.");
  const active = step.actions.filter(
    (a) =>
      (moves.includes(a) && a.actorId && a.status !== "unassigned") ||
      (a.kind === "pass" && a.status === "confirmed"),
  );
  const groups = [...new Set(active.map((a) => a.order ?? 0))].sort(
    (a, b) => a - b,
  );
  const defaultDuration =
    (step.timing?.durationMs ?? DEFAULT_DURATION) / Math.max(1, groups.length);
  const tracks: Track[] = [];
  let start = 0;
  for (const group of groups) {
    let end = start;
    for (const a of active.filter((a) => (a.order ?? 0) === group)) {
      const duration = a.durationMs ?? defaultDuration;
      tracks.push({
        action: a,
        start,
        end: start + duration,
        path: route(a.geometry),
      });
      end = Math.max(end, start + duration);
    }
    start = end;
  }
  const plan: StepPlan = {
    step,
    duration: Math.max(step.timing?.durationMs ?? DEFAULT_DURATION, start),
    tracks,
    issues,
    animated: false,
    raw,
  };
  for (const id of Object.keys(step.beforeState.players)) {
    const paths = tracks
      .filter((t) => t.action.kind !== "pass" && t.action.actorId === id)
      .sort((a, b) => a.start - b.start);
    let previous = step.beforeState.players[id],
      lastEnd = 0;
    for (const t of paths) {
      if (t.start < lastEnd)
        add(`Joueur ${id} : trajets simultanés à ordonner.`);
      if (!equalPoint(previous, t.action.geometry.points[0]))
        add(`Joueur ${id} : départ du trajet à confirmer.`);
      previous = t.action.geometry.points.at(-1)!;
      lastEnd = t.end;
    }
    if (!equalPoint(previous, step.afterState.players[id]))
      add(`Joueur ${id} : destination sans trajet complet.`);
  }
  const beforeD = step.beforeState.defenders ?? {},
    afterD = step.afterState.defenders ?? {};
  if (
    Object.keys(beforeD).length !== Object.keys(afterD).length ||
    Object.keys(beforeD).some((id) => !equalPoint(beforeD[id], afterD[id]))
  )
    add("Défenseurs : déplacement sans trajet renseigné.");
  const pass = tracks.find((t) => t.action.kind === "pass");
  if (pass) {
    const a = pass.action;
    if (
      !a.actorId ||
      !a.recipientId ||
      step.beforeState.ball?.mode !== "attached" ||
      step.beforeState.ball.carrierId !== a.actorId ||
      step.afterState.ball?.mode !== "attached" ||
      step.afterState.ball.carrierId !== a.recipientId
    )
      add("Passe : possession à confirmer.");
    else {
      if (
        !equalPoint(
          a.geometry.points[0],
          playerAt(plan, a.actorId, pass.start),
        ) ||
        !equalPoint(
          a.geometry.points.at(-1),
          playerAt(plan, a.recipientId, pass.end),
        )
      )
        add(
          "Passe : ordonner les déplacements pour rejoindre le passeur et le destinataire.",
        );
    }
  } else if (!sameBall(step.beforeState.ball, step.afterState.ball))
    add("Changement de ballon sans passe validée : lecture statique.");
  plan.animated = issues.length === 0 && tracks.length > 0;
  return plan;
}
export function sample(plan: StepPlan, time: number): State {
  if (!plan.animated || time >= plan.duration)
    return structuredClone(plan.step.afterState);
  const t = Math.max(0, time);
  const state = structuredClone(plan.step.beforeState);
  for (const id of Object.keys(state.players))
    state.players[id] = playerAt(plan, id, t);
  const pass = plan.tracks.find((t) => t.action.kind === "pass");
  if (pass && t >= pass.start) {
    if (t >= pass.end)
      state.ball = { mode: "attached", carrierId: pass.action.recipientId! };
    else {
      const p = pass.path.at((t - pass.start) / (pass.end - pass.start));
      state.ball = {
        mode: "free",
        position: [p[0] + (plan.raw ? 11 : 22), p[1] + (plan.raw ? 7 : 14)],
      };
    }
  }
  return state;
}
/** Horloge indépendante du DOM : pause et vitesse conservent exactement le temps courant. */
export class PlaybackClock {
  elapsed = 0;
  playing = false;
  speed = 1;
  private stamp = 0;
  reset(now: number, elapsed = 0) {
    this.elapsed = elapsed;
    this.stamp = now;
    this.playing = false;
  }
  resume(now: number) {
    this.stamp = now;
    this.playing = true;
  }
  tick(now: number) {
    if (this.playing) {
      this.elapsed += Math.max(0, now - this.stamp) * this.speed;
      this.stamp = now;
    }
    return this.elapsed;
  }
  pause(now: number) {
    this.tick(now);
    this.playing = false;
  }
  setSpeed(speed: number, now: number) {
    if (!Number.isFinite(speed) || speed < 0.25 || speed > 3)
      throw new Error("Vitesse hors limites.");
    this.tick(now);
    this.speed = speed;
  }
  seek(elapsed: number, now: number) {
    this.elapsed = Math.max(0, elapsed);
    this.stamp = now;
  }
}
