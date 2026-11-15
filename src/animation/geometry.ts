import type { Action, Point } from "../model/types";
export const equalPoint = (
  a: Point | undefined,
  b: Point | undefined,
  epsilon = 0.01,
) => !!a && !!b && Math.hypot(a[0] - b[0], a[1] - b[1]) <= epsilon;
export const lerp = (a: Point, b: Point, t: number): Point => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];
/** Échantillonnage de la même conversion Catmull-Rom → Bézier que le SVG. */
export function route(geometry: Action["geometry"]) {
  const p = geometry.points;
  if (geometry.kind !== "catmull-rom")
    return {
      length: Math.hypot(p.at(-1)![0] - p[0][0], p.at(-1)![1] - p[0][1]),
      at: (t: number) => lerp(p[0], p.at(-1)!, Math.max(0, Math.min(1, t))),
    };
  const samples: { point: Point; distance: number }[] = [
    { point: p[0], distance: 0 },
  ];
  let length = 0;
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[Math.max(0, i - 1)],
      b = p[i],
      c = p[i + 1],
      z = p[Math.min(i + 2, p.length - 1)];
    const cp1: Point = [b[0] + (c[0] - a[0]) / 6, b[1] + (c[1] - a[1]) / 6],
      cp2: Point = [c[0] - (z[0] - b[0]) / 6, c[1] - (z[1] - b[1]) / 6];
    for (let n = 1; n <= 48; n++) {
      const t = n / 48,
        u = 1 - t;
      const point: Point = [
        u * u * u * b[0] +
          3 * u * u * t * cp1[0] +
          3 * u * t * t * cp2[0] +
          t * t * t * c[0],
        u * u * u * b[1] +
          3 * u * u * t * cp1[1] +
          3 * u * t * t * cp2[1] +
          t * t * t * c[1],
      ];
      const prev = samples.at(-1)!.point;
      length += Math.hypot(point[0] - prev[0], point[1] - prev[1]);
      samples.push({ point, distance: length });
    }
  }
  return {
    length,
    at: (progress: number): Point => {
      const distance = Math.max(0, Math.min(1, progress)) * length;
      if (distance === 0) return [...p[0]];
      if (distance === length) return [...p.at(-1)!];
      let lo = 0,
        hi = samples.length - 1;
      while (lo + 1 < hi) {
        const mid = (lo + hi) >> 1;
        if (samples[mid].distance < distance) lo = mid;
        else hi = mid;
      }
      const a = samples[lo],
        b = samples[hi];
      return lerp(
        a.point,
        b.point,
        (distance - a.distance) / (b.distance - a.distance || 1),
      );
    },
  };
}
