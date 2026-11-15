import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import * as cmd from "../src/editor/commands";
import { compileStep, PlaybackClock, sample } from "../src/animation/engine";
import { route } from "../src/animation/geometry";
import { validatePlay } from "../src/model/validate";
import { migrateSources } from "../src/migration/migrate";
import { sequence } from "../src/model/types";
const init = () => cmd.initialize(cmd.createPlay("Animation"));

test("route courbe déterministe, début/fin exacts et mouvement réellement courbé", () => {
  const path = route({
    kind: "catmull-rom",
    points: [
      [0, 0],
      [100, 100],
      [200, 0],
    ],
  });
  expect(path.at(0)).toEqual([0, 0]);
  expect(path.at(1)).toEqual([200, 0]);
  expect(path.at(0.5)[0]).toBeCloseTo(100, 5);
  expect(path.at(0.5)[1]).toBeCloseTo(100, 5);
  expect(path.length).toBeGreaterThan(280);
  let p = init();
  const id = p.commonSteps[0].id;
  p = cmd.addAction(
    p,
    id,
    "run",
    [
      [375, 440],
      [250, 330],
      [200, 180],
    ],
    "1",
    undefined,
    true,
  ).play;
  const plan = compileStep(p.commonSteps[0]);
  expect(plan.animated).toBe(true);
  expect(sample(plan, 0)).toEqual(p.commonSteps[0].beforeState);
  expect(sample(plan, plan.duration)).toEqual(p.commonSteps[0].afterState);
  expect(sample(plan, plan.duration / 2)).toEqual(
    sample(plan, plan.duration / 2),
  );
});

test("groupes et durées : simultanéité et attente des groupes précédents", () => {
  let p = init(),
    id = p.commonSteps[0].id;
  const a = cmd.addAction(
    p,
    id,
    "run",
    [
      [375, 440],
      [275, 340],
    ],
    "1",
  );
  p = a.play;
  const b = cmd.addAction(
    p,
    id,
    "screen",
    [
      [100, 110],
      [200, 210],
    ],
    "4",
  );
  p = b.play;
  p = cmd.editAction(p, id, a.actionId, (a) => {
    a.order = 0;
    a.durationMs = 800;
  });
  p = cmd.editAction(p, id, b.actionId, (a) => {
    a.order = 1;
    a.durationMs = 1200;
  });
  const plan = compileStep(p.commonSteps[0]);
  expect(plan.duration).toBe(2000);
  expect(plan.tracks.map((t) => [t.start, t.end])).toEqual([
    [0, 800],
    [800, 2000],
  ]);
  expect(sample(plan, 400).players["1"]).toEqual([325, 390]);
  expect(sample(plan, 400).players["4"]).toEqual([100, 110]);
  expect(sample(plan, 1400).players["4"]).toEqual([150, 160]);
});

test("pause, reprise et vitesse conservent le temps sans saut", () => {
  const clock = new PlaybackClock();
  clock.reset(0);
  clock.resume(100);
  expect(clock.tick(400)).toBe(300);
  clock.pause(450);
  expect(clock.elapsed).toBe(350);
  expect(clock.tick(900)).toBe(350);
  clock.resume(1000);
  clock.setSpeed(2, 1100);
  expect(clock.elapsed).toBe(450);
  expect(clock.tick(1200)).toBe(650);
  clock.pause(1250);
  expect(clock.elapsed).toBe(750);
  clock.seek(200, 2000);
  expect(clock.tick(2500)).toBe(200);
  expect(() => clock.setSpeed(NaN, 3000)).toThrow();
});

test("ballon attaché suit le porteur ; une passe optionnelle ne transfère jamais le ballon", () => {
  let p = init(),
    id = p.commonSteps[0].id;
  p = cmd.setBall(p, id, { mode: "attached", carrierId: "1" }, true);
  p = cmd.addAction(
    p,
    id,
    "run",
    [
      [375, 440],
      [275, 340],
    ],
    "1",
  ).play;
  p = cmd.addAction(
    p,
    id,
    "pass",
    [
      [275, 340],
      [650, 110],
    ],
    "1",
    "2",
  ).play;
  const plan = compileStep(p.commonSteps[0]);
  expect(plan.animated).toBe(true);
  expect(sample(plan, 700).ball).toEqual({ mode: "attached", carrierId: "1" });
  expect(sample(plan, 700).players["1"]).toEqual([325, 390]);
});

test("passe confirmée : départ attaché, vol sur le tracé et réception attachée", () => {
  let p = init(),
    id = p.commonSteps[0].id;
  p = cmd.setBall(p, id, { mode: "attached", carrierId: "1" }, true);
  const pass = cmd.addAction(
    p,
    id,
    "pass",
    [
      [375, 440],
      [650, 110],
    ],
    "1",
    "2",
  );
  p = cmd.confirmPass(pass.play, id, pass.actionId, true);
  const plan = compileStep(p.commonSteps[0]);
  expect(plan.issues).toEqual([]);
  expect(sample(plan, 0).ball).toEqual({ mode: "free", position: [397, 454] });
  expect(sample(plan, 700).ball).toEqual({
    mode: "free",
    position: [534.5, 289],
  });
  expect(sample(plan, 1400).ball).toEqual({ mode: "attached", carrierId: "2" });
  const before = plan.step.beforeState.players["1"],
    after = plan.step.afterState.players["2"];
  expect(sample(plan, 1399.999).ball?.mode).toBe("free");
  expect(before).toEqual([375, 440]);
  expect(after).toEqual([650, 110]);
});

test("ordre de passe incompatible signalé ; délai explicite corrige le départ", () => {
  let p = init(),
    id = p.commonSteps[0].id;
  p = cmd.setBall(p, id, { mode: "attached", carrierId: "1" }, true);
  const move = cmd.addAction(
    p,
    id,
    "run",
    [
      [375, 440],
      [275, 340],
    ],
    "1",
  );
  p = move.play;
  const pass = cmd.addAction(
    p,
    id,
    "pass",
    [
      [275, 340],
      [650, 110],
    ],
    "1",
    "2",
  );
  p = cmd.confirmPass(pass.play, id, pass.actionId, true);
  expect(compileStep(p.commonSteps[0]).issues.join()).toContain("ordonner");
  p = cmd.editAction(p, id, pass.actionId, (a) => {
    a.order = 1;
  });
  expect(compileStep(p.commonSteps[0]).animated).toBe(true);
});

test("sources ambiguës : Stack, changement de porteur non validé et écran sans trajet restent statiques", () => {
  const lib = migrateSources(
    readFileSync("sources/index_original.html", "utf8"),
    readFileSync("sources/stack_user_v2.json", "utf8"),
  );
  for (const step of lib.plays[5].commonSteps) {
    const plan = compileStep(step, true);
    expect(plan.animated).toBe(false);
    expect(plan.issues.length).toBeGreaterThan(0);
    expect(sample(plan, 350)).toEqual(step.afterState);
  }
  const pass = compileStep(lib.plays[0].commonSteps[1]);
  expect(pass.issues.join()).toContain("sans passe validée");
  expect(pass.animated).toBe(false);
  const iso = lib.plays[1];
  for (const b of iso.branches) {
    expect(sequence(iso, b.id).slice(0, 2)).toEqual(iso.commonSteps);
  }
  const placed = structuredClone(lib.plays[0].commonSteps[0]);
  placed.actions = [
    {
      id: "screen",
      kind: "screen",
      actorId: "1",
      status: "recorded",
      geometry: {
        kind: "legacy-screen",
        points: [placed.afterState.players["1"]],
      },
    },
  ];
  expect(compileStep(placed).tracks).toHaveLength(0);
});

test("timings en schéma 3, relecture sans perte et refus des valeurs invalides", () => {
  let p = init(),
    id = p.commonSteps[0].id;
  p = cmd.changeStep(p, id, (s) => {
    s.timing = { durationMs: 2300 };
  });
  expect(p.schemaVersion).toBe(3);
  expect(validatePlay(JSON.parse(JSON.stringify(p)))).toEqual(p);
  expect(() =>
    cmd.changeStep(p, id, (s) => {
      s.timing = { durationMs: Infinity };
    }),
  ).toThrow();
  const old = structuredClone(p);
  old.schemaVersion = 2;
  expect(() => validatePlay(old)).toThrow("schéma 3");
});
