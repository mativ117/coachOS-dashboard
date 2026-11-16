import type { Point } from "../model/types";
function distance(p: Point, a: Point, b: Point) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    length = dx * dx + dy * dy;
  const t = length
    ? Math.max(
        0,
        Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length),
      )
    : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
function simplify(points: Point[], tolerance: number): Point[] {
  if (points.length < 3) return points.map((p) => [...p]);
  const keep = new Set([0, points.length - 1]),
    stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop()!;
    let max = tolerance,
      index = -1;
    for (let i = start + 1; i < end; i++) {
      const d = distance(points[i], points[start], points[end]);
      if (d > max) {
        max = d;
        index = i;
      }
    }
    if (index >= 0) {
      keep.add(index);
      stack.push([start, index], [index, end]);
    }
  }
  return [...keep].sort((a, b) => a - b).map((i) => [...points[i]]);
}
/** Nettoyage proportionnel aux pixels affichés. Les extrémités et les vrais changements de direction restent présents. */
export function cleanStroke(input: Point[], scale = 1): Point[] {
  if (!input.length) return [];
  const pixels = Math.max(0.02, Math.abs(scale));
  const points: Point[] = [input[0]];
  for (let i = 1; i < input.length - 1; i++)
    if (
      Math.hypot(
        input[i][0] - points.at(-1)![0],
        input[i][1] - points.at(-1)![1],
      ) *
        pixels >=
      0.6
    )
      points.push(input[i]);
  if (input.length > 1) points.push(input.at(-1)!);
  if (points.length < 2) return points.map((p) => [...p]);
  const straight = points.every(
    (p) => distance(p, points[0], points.at(-1)!) * pixels <= 3,
  );
  if (straight) return [[...points[0]], [...points.at(-1)!]];
  let tolerance = 1.6 / pixels,
    result = simplify(points, tolerance);
  while (result.length > 96) {
    tolerance *= 1.25;
    result = simplify(points, tolerance);
  }
  return result;
}

/** Les virages francs restent angulaires ; les courbes douces sont lissées. */
export function strokeKind(
  points: Point[],
  scale = 1,
): "line" | "polyline" | "catmull-rom" {
  if (points.length <= 2) return "line";
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1],
      b = points[i],
      c = points[i + 1],
      u: [number, number] = [b[0] - a[0], b[1] - a[1]],
      v: [number, number] = [c[0] - b[0], c[1] - b[1]];
    const first = Math.hypot(...u),
      second = Math.hypot(...v);
    if (Math.min(first, second) * Math.abs(scale) < 6) continue;
    if (
      (u[0] * v[0] + u[1] * v[1]) / (first * second) <
      Math.cos((70 * Math.PI) / 180)
    )
      return "polyline";
  }
  return "catmull-rom";
}
