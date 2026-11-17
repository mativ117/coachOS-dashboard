import { expect, test } from "@playwright/test";
import * as c from "../src/editor/commands";
import { validatePlay } from "../src/model/validate";
import { playFile, parseFile } from "../src/files/formats";
import { outsideHalf, fittedBox } from "../src/editor/viewport";

test("placement initial, héritage et mouvements seulement explicites", () => {
  let p = c.initialize(c.createPlay("Placement"), true);
  const setup = p.commonSteps[0].id;
  expect(p.schemaVersion).toBe(4);
  expect(p.commonSteps[0].purpose).toBe("setup");
  p = c.movePlayer(p, setup, "1", [330, 400]);
  p = c.setBall(p, setup, { mode: "attached", carrierId: "2" });
  expect(p.initialState).toEqual(p.commonSteps[0].beforeState);
  expect(p.initialState).toEqual(p.commonSteps[0].afterState);
  let next = c.addStep(p, "common", setup);
  p = next.play;
  const movement = next.stepId;
  expect(p.commonSteps[1].beforeState).toEqual(p.commonSteps[0].afterState);
  p = c.movePlayer(p, movement, "3", [500, 320]);
  expect(p.commonSteps[1].actions).toEqual([]);
  p = c.addAction(
    p,
    movement,
    "run",
    [
      [330, 400],
      [250, 350],
    ],
    "1",
  ).play;
  next = c.addStep(p, "common", movement);
  p = next.play;
  expect(p.commonSteps[2].beforeState.players["1"]).toEqual([250, 350]);
  expect(p.commonSteps[2].actions).toEqual([]);
  p = c.movePlayer(p, setup, "1", [350, 430]);
  expect(p.commonSteps[1].actions[0].geometry.points).toEqual([
    [350, 430],
    [250, 350],
  ]);
  expect(p.commonSteps[1].afterState.players["1"]).toEqual([250, 350]);
  const incoming = parseFile(playFile(p));
  expect(incoming.kind).toBe("play");
  if (incoming.kind === "play") expect(incoming.play).toEqual(p);
});

test("placement explicite versionné : ni action ni insertion arbitraire", () => {
  const p = c.initialize(c.createPlay("Validation"), true);
  const old = structuredClone(p);
  old.schemaVersion = 3;
  expect(() => validatePlay(old)).toThrow();
  const moved = structuredClone(p);
  moved.commonSteps[0].afterState.players["1"] = [100, 100];
  expect(() => validatePlay(moved)).toThrow();
  const drawn = c.addAction(
    p,
    p.commonSteps[0].id,
    "run",
    [
      [375, 440],
      [300, 300],
    ],
    "1",
  ).play;
  expect(drawn.commonSteps[0].purpose).toBeUndefined();
  expect(drawn.initialState).toEqual(p.initialState);
  expect(drawn.commonSteps[0].actions).toHaveLength(1);
  const ordinary = c.initialize(c.createPlay("Compatibilité"));
  expect(ordinary.schemaVersion).toBe(2);
  expect(ordinary.commonSteps[0].purpose).toBeUndefined();
});

test("hors cadre : branches, ballon et défenseurs pris en compte sans déplacer les données", () => {
  let p = c.initialize(c.createPlay("Cadre"));
  let branch = c.addBranch(p, "Lecture", p.commonSteps[0].id);
  p = branch.play;
  p = c.movePlayer(p, branch.stepId, "1", [375, 1000]);
  expect(outsideHalf(p)).toBe(true);
  const before = structuredClone(p);
  const box = fittedBox(p, "0 0 750 655").split(" ").map(Number);
  expect(box[1] + box[3]).toBeGreaterThan(1000);
  expect(p).toEqual(before);
});

test("corriger le départ d’une étape après le placement conserve sa cohérence", () => {
  let p = c.initialize(c.createPlay("Ballon"), true);
  const next = c.addStep(p, "common", p.commonSteps[0].id);
  p = next.play;
  p = c.setBall(p, next.stepId, { mode: "attached", carrierId: "3" }, true);
  expect(p.initialState.ball).toEqual({ mode: "attached", carrierId: "3" });
  expect(p.commonSteps[0].afterState.ball).toEqual(p.initialState.ball);
  expect(p.commonSteps[1].beforeState.ball).toEqual(p.initialState.ball);
});
