import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import * as cmd from "../src/editor/commands";
import { migrateSources } from "../src/migration/migrate";
import { validatePlay } from "../src/model/validate";
const initialized = () => cmd.initialize(cmd.createPlay("Test éditeur"));

test("initialisation, déplacement et références : sources jamais modifiées", () => {
  const draft = cmd.createPlay("Système");
  expect(draft.initialState.players).toEqual({});
  let p = cmd.initialize(draft);
  expect(Object.keys(p.commonSteps[0].afterState.players)).toHaveLength(5);
  p = cmd.movePlayer(p, p.commonSteps[0].id, "1", [300, 400]);
  expect(p.commonSteps[0].afterState.players["1"]).toEqual([300, 400]);
  expect(draft.commonSteps).toHaveLength(0);
  expect(validatePlay(JSON.parse(JSON.stringify(p)))).toEqual(p);
});

test("modification commune propagée, lectures autonomes, destinations explicites préservées", () => {
  let p = initialized();
  const first = p.commonSteps[0].id;
  const second = cmd.addStep(p, "common", first);
  p = second.play;
  const b1 = cmd.addBranch(p, "Lecture A", second.stepId);
  p = b1.play;
  const b2 = cmd.addBranch(p, "Lecture B", second.stepId);
  p = b2.play;
  const move = cmd.addAction(
    p,
    b1.stepId,
    "run",
    [
      [375, 440],
      [100, 200],
    ],
    "1",
  );
  p = move.play;
  p = cmd.movePlayer(p, first, "1", [310, 410]);
  expect(p.commonSteps[1].afterState.players["1"]).toEqual([310, 410]);
  expect(p.branches[0].steps[0].beforeState.players["1"]).toEqual([310, 410]);
  expect(p.branches[0].steps[0].afterState.players["1"]).toEqual([100, 200]);
  expect(p.branches[0].steps[0].actions[0].geometry.points[0]).toEqual([
    310, 410,
  ]);
  expect(p.branches[1].steps[0].afterState.players["1"]).toEqual([310, 410]);
  expect(p.commonSteps).toHaveLength(2);
});

test("courbes, écrans courbes, annotations et points rechargés sans perte", () => {
  let p = initialized();
  const step = p.commonSteps[0].id;
  const curve = cmd.addAction(
    p,
    step,
    "run",
    [
      [375, 440],
      [220, 280],
      [300, 150],
    ],
    "1",
    undefined,
    true,
  );
  p = curve.play;
  p = cmd.editPoint(p, step, curve.actionId, 1, [210, 310]);
  p = cmd.addAction(
    p,
    step,
    "screen",
    [
      [100, 110],
      [130, 210],
      [220, 300],
    ],
    "4",
    undefined,
    true,
  ).play;
  p = cmd.addAction(
    p,
    step,
    "annotation",
    [[330, 330]],
    undefined,
    undefined,
    false,
    "Lecture <script>texte</script>",
  ).play;
  const restored = validatePlay(JSON.parse(JSON.stringify(p)));
  expect(restored.commonSteps[0].actions[0].geometry.points[1]).toEqual([
    210, 310,
  ]);
  expect(restored.commonSteps[0].actions[1].geometry).toEqual({
    kind: "catmull-rom",
    points: [
      [100, 110],
      [130, 210],
      [220, 300],
    ],
  });
  expect(restored.commonSteps[0].actions[2].text).toContain("<script>");
});

test("passe optionnelle puis validée : possession explicite et réversible", () => {
  let p = initialized();
  const step = p.commonSteps[0].id;
  p = cmd.setBall(p, step, { mode: "attached", carrierId: "1" }, true);
  const pass = cmd.addAction(
    p,
    step,
    "pass",
    [
      [375, 440],
      [650, 110],
    ],
    "1",
    "2",
  );
  p = pass.play;
  expect(p.commonSteps[0].afterState.ball).toEqual({
    mode: "attached",
    carrierId: "1",
  });
  p = cmd.confirmPass(p, step, pass.actionId, true);
  expect(p.commonSteps[0].afterState.ball).toEqual({
    mode: "attached",
    carrierId: "2",
  });
  expect(p.commonSteps[0].actions[0].status).toBe("confirmed");
  expect(() =>
    cmd.setBall(p, step, { mode: "free", position: [200, 200] }),
  ).toThrow("passe exécutée");
  p = cmd.confirmPass(p, step, pass.actionId, false);
  expect(p.commonSteps[0].afterState.ball).toEqual({
    mode: "attached",
    carrierId: "1",
  });
  const unknown = cmd.setBall(p, step, null, true);
  expect(() => cmd.confirmPass(unknown, step, pass.actionId, true)).toThrow(
    "porteur",
  );
});

test("défenseurs et ballon libre, étapes et branchements cohérents", () => {
  let p = initialized();
  const first = p.commonSteps[0].id;
  p = cmd.changeStep(p, first, (s) => {
    s.afterState.defenders = { "1": [200, 200] };
  });
  const second = cmd.addStep(p, "common", first);
  p = second.play;
  expect(p.commonSteps[1].beforeState.defenders).toEqual({ "1": [200, 200] });
  p = cmd.changeStep(p, first, (s) => {
    delete s.afterState.defenders;
  });
  expect(Object.keys(p.commonSteps[1].afterState.defenders ?? {})).toHaveLength(
    0,
  );
  p = cmd.setBall(p, second.stepId, { mode: "free", position: [210, 220] });
  expect(p.commonSteps[1].afterState.ball).toEqual({
    mode: "free",
    position: [210, 220],
  });
  const branch = cmd.addBranch(p, "Variante", second.stepId);
  p = branch.play;
  p = cmd.deleteStep(p, second.stepId);
  expect(p.branches[0].forkStepId).toBe(first);
  expect(validatePlay(p)).toEqual(p);
});

test("édition historique et Stack : rapport original conservé, association explicite", () => {
  const library = migrateSources(
    readFileSync("sources/index_original.html", "utf8"),
    readFileSync("sources/stack_user_v2.json", "utf8"),
  );
  const historical = library.plays[0];
  const changed = cmd.movePlayer(
    historical,
    historical.commonSteps[0].id,
    "1",
    [310, 410],
  );
  expect(changed.metadata.originalReport).toEqual(historical.metadata.report);
  expect(changed.schemaVersion).toBe(2);
  expect(historical.schemaVersion).toBe(1);
  const stack = library.plays[5],
    s = stack.commonSteps[0];
  const associated = cmd.editAction(stack, s.id, s.actions[0].id, (a) => {
    a.actorId = "1";
    a.recipientId = "5";
    a.status = "optional";
  });
  expect(associated.commonSteps[0].actions[0].actorId).toBe("1");
  expect(stack.commonSteps[0].actions[0].actorId).toBeUndefined();
});
