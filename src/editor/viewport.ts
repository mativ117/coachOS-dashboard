import type { Play, Point } from "../model/types";
export function playPoints(play: Play): Point[] {
  const steps = [...play.commonSteps, ...play.branches.flatMap((b) => b.steps)];
  return [
    play.initialState,
    ...steps.flatMap((s) => [s.beforeState, s.afterState]),
  ]
    .flatMap((s) => [
      ...Object.values(s.players),
      ...Object.values(s.defenders ?? {}),
      ...(s.ball?.mode === "free" ? [s.ball.position] : []),
    ])
    .concat(steps.flatMap((s) => s.actions.flatMap((a) => a.geometry.points)));
}
export function outsideHalf(play: Play) {
  return playPoints(play).some(
    ([x, y]) => x < 0 || x > 750 || y < 0 || y > 655,
  );
}
export function fittedBox(play: Play, base: string): string {
  const [x, y, w, h] = base.split(" ").map(Number);
  const points = playPoints(play);
  const left = Math.min(x, ...points.map((p) => p[0] - 40)),
    top = Math.min(y, ...points.map((p) => p[1] - 40));
  const right = Math.max(x + w, ...points.map((p) => p[0] + 40)),
    bottom = Math.max(y + h, ...points.map((p) => p[1] + 40));
  return `${left} ${top} ${right - left} ${bottom - top}`;
}
