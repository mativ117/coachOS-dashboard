import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { migrateSources } from "../src/migration/migrate";
import { continuation } from "../src/library/resume";
test("reprise validée dans la bonne lecture, sans accepter un curseur périmé", () => {
  const play = migrateSources(
    readFileSync("sources/index_original.html", "utf8"),
    readFileSync("sources/stack_user_v2.json", "utf8"),
  ).plays.find((p) => p.branches.length)!;
  const original = structuredClone(play),
    branch = play.branches[1],
    step = branch.steps.at(-1)!;
  const entry = {
    playId: play.id,
    branchId: branch.id,
    stepId: step.id,
    openedAt: 123,
  };
  expect(continuation(play, [entry])?.step.id).toBe(step.id);
  expect(continuation(play, [entry])?.branch?.id).toBe(branch.id);
  expect(
    continuation(play, [{ ...entry, branchId: "absente" }]),
  ).toBeUndefined();
  expect(
    continuation(play, [{ ...entry, stepId: "supprimée" }]),
  ).toBeUndefined();
  expect(continuation(play, [{ ...entry, playId: "autre" }])).toBeUndefined();
  expect(play).toEqual(original);
});
