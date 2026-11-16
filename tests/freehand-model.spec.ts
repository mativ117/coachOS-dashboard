import { expect, test } from "@playwright/test";
import { cleanStroke, strokeKind } from "../src/editor/cleanStroke";
import type { Point } from "../src/model/types";

test("trait presque droit : deux extrémités exactes et aucun tremblement conservé", () => {
  const points: Point[] = Array.from({ length: 101 }, (_, i) => [
    i * 3,
    100 + Math.sin(i) * 0.8,
  ]);
  const before = structuredClone(points);
  expect(cleanStroke(points)).toEqual([points[0], points.at(-1)]);
  expect(points).toEqual(before);
});
test("zigzag et boucle : le nettoyage garde les changements de direction et les extrémités", () => {
  const anchors: Point[] = [
    [0, 300],
    [100, 200],
    [0, 100],
    [100, 0],
  ];
  const sampled: Point[] = [];
  for (let j = 1; j < anchors.length; j++)
    for (let i = 0; i < 40; i++) {
      const t = i / 40;
      sampled.push([
        anchors[j - 1][0] + (anchors[j][0] - anchors[j - 1][0]) * t,
        anchors[j - 1][1] + (anchors[j][1] - anchors[j - 1][1]) * t,
      ]);
    }
  sampled.push(anchors.at(-1)!);
  const result = cleanStroke(sampled);
  expect(result).toEqual(anchors);
  expect(result.length).toBeLessThan(sampled.length / 5);
  const loop: Point[] = Array.from({ length: 200 }, (_, i) => [
    100 + 80 * Math.cos((i * 2 * Math.PI) / 199),
    100 + 80 * Math.sin((i * 2 * Math.PI) / 199),
  ]);
  const cleaned = cleanStroke(loop);
  expect(cleaned.length).toBeGreaterThan(8);
  expect(cleaned[0]).toEqual(loop[0]);
  expect(cleaned.at(-1)).toEqual(loop.at(-1));
});
test("nettoyage borné et proportionnel au zoom, sans modification du tracé d’origine", () => {
  const points: Point[] = Array.from({ length: 2048 }, (_, i) => [
    i * 0.3,
    100 + Math.sin(i * 0.15) * 80,
  ]);
  const cleaned = cleanStroke(points, 0.5);
  expect(cleaned.length).toBeLessThanOrEqual(96);
  expect(cleaned[0]).toEqual(points[0]);
  expect(cleaned.at(-1)).toEqual(points.at(-1));
  const original: Point[] = [
    [0, 0],
    [20, 40],
    [40, 0],
  ];
  expect(cleanStroke(original, 1)).toEqual(original);
  expect(
    cleanStroke(
      original.map(([x, y]) => [x * 2, y * 2]),
      0.5,
    ),
  ).toEqual(original.map(([x, y]) => [x * 2, y * 2]));
  expect(cleanStroke([])).toEqual([]);
  expect(cleanStroke([[1, 2]])).toEqual([[1, 2]]);
});

test("angles conservés, courbes douces lissées et animation sur toute la ligne", async () => {
  const { route } = await import("../src/animation/geometry");
  const zigzag: Point[] = [
    [0, 0],
    [100, 100],
    [0, 200],
  ];
  expect(strokeKind(zigzag)).toBe("polyline");
  expect(
    strokeKind([
      [0, 0],
      [50, 15],
      [100, 0],
    ]),
  ).toBe("catmull-rom");
  const geometry = { kind: "polyline" as const, points: zigzag };
  const path = route(geometry);
  expect(path.length).toBeCloseTo(2 * Math.sqrt(20000));
  expect(path.at(0.5)).toEqual([100, 100]);
  expect(path.at(1)).toEqual([0, 200]);
  const c = await import("../src/editor/commands");
  const { playFile, parseFile } = await import("../src/files/formats");
  let play = c.initialize(c.createPlay("Zigzag"));
  play = c.addAction(
    play,
    play.commonSteps[0].id,
    "run",
    [
      [375, 440],
      [250, 300],
      [375, 200],
    ],
    "1",
    undefined,
    false,
    undefined,
    "polyline",
  ).play;
  expect(play.schemaVersion).toBe(4);
  const incoming = parseFile(playFile(play));
  expect(incoming.kind).toBe("play");
  if (incoming.kind === "play") expect(incoming.play).toEqual(play);
});
