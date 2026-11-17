import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { migrateSources } from "../src/migration/migrate";
import { classifyLibrary } from "../src/library/ownership";
import * as c from "../src/editor/commands";
import { validateLibrary, validatePlay } from "../src/model/validate";
import { duplicateInLibrary, buildImport } from "../src/files/import-plan";
import { backupFile, parseFile, playFile } from "../src/files/formats";
const seed = () =>
  migrateSources(
    readFileSync("sources/index_original.html", "utf8"),
    readFileSync("sources/stack_user_v2.json", "utf8"),
  );
test("placement converti atomiquement, héritage et relecture pour tous les tracés", () => {
  for (const shape of [
    "line",
    "catmull-rom",
    "polyline",
    "legacy-screen",
  ] as const) {
    let p = c.initialize(c.createPlay("Tracés"), true);
    const original = structuredClone(p);
    const id = p.commonSteps[0].id;
    p = c.addStep(p, "common", id).play;
    p = c.addBranch(p, "Alternative", id).play;
    const points: [number, number][] =
      shape === "legacy-screen"
        ? [[375, 440]]
        : shape === "line"
          ? [
              [375, 440],
              [300, 300],
            ]
          : [
              [375, 440],
              [330, 350],
              [300, 300],
            ];
    p = c.addAction(
      p,
      id,
      shape === "legacy-screen" ? "screen" : "run",
      points,
      "1",
      undefined,
      shape === "catmull-rom",
      undefined,
      shape === "polyline" || shape === "legacy-screen" ? shape : undefined,
    ).play;
    expect(p.initialState).toEqual(original.initialState);
    expect(p.commonSteps[0].purpose).toBeUndefined();
    expect(p.commonSteps[0].actions[0].geometry.kind).toBe(shape);
    expect(p.commonSteps[1].beforeState).toEqual(p.commonSteps[0].afterState);
    expect(p.branches[0].steps[0].beforeState).toEqual(
      p.commonSteps[0].afterState,
    );
    if (shape === "legacy-screen")
      expect(p.commonSteps[0].afterState).toEqual(p.initialState);
    expect(parseFile(playFile(p)).kind).toBe("play");
    expect(validatePlay(original)).toEqual(original);
  }
});
test("migration prudente : seuls les exemples identiques restent exemples", () => {
  const old = seed(),
    before = structuredClone(old),
    personal = c.initialize(c.createPlay("Personnel"), true);
  old.plays[0] = c.changeStep(
    old.plays[0],
    old.plays[0].commonSteps[0].id,
    (s) => {
      s.note = "Mon adaptation";
    },
  );
  old.plays.push(personal);
  const upgraded = classifyLibrary(old, before.plays);
  expect(upgraded.librarySchemaVersion).toBe(3);
  expect(upgraded.examplePlayIds).not.toContain(old.plays[0].id);
  expect(upgraded.examplePlayIds).not.toContain(personal.id);
  expect(upgraded.examplePlayIds).toHaveLength(7);
  expect(upgraded.plays).toEqual(old.plays);
  expect(validateLibrary(upgraded)).toEqual(upgraded);
  const backup = parseFile(backupFile(upgraded));
  expect(backup.kind).toBe("backup");
  if (backup.kind === "backup") expect(backup.library).toEqual(upgraded);
});
test("copies et imports deviennent personnels, exemples et références restent cohérents", () => {
  const old = seed(),
    lib = classifyLibrary(old, old.plays),
    id = lib.plays[0].id;
  const copied = duplicateInLibrary(lib, id);
  expect(copied.examplePlayIds).toEqual(lib.examplePlayIds);
  expect(copied.examplePlayIds).not.toContain(copied.plays.at(-1)!.id);
  const modified = c.changePlay(lib.plays[0], (p) => {
    p.name = "Import personnel";
  });
  const merged = buildImport(
    lib,
    { kind: "play", play: modified, legacy: false },
    { [id]: "copy" },
    "merge",
  );
  expect(merged.examplePlayIds).toContain(id);
  expect(merged.examplePlayIds).not.toContain(merged.plays.at(-1)!.id);
  const replaced = buildImport(
    lib,
    { kind: "play", play: modified, legacy: false },
    { [id]: "replace" },
    "merge",
  );
  expect(replaced.examplePlayIds).not.toContain(id);
  expect(() =>
    validateLibrary({ ...lib, examplePlayIds: ["absent"] }),
  ).toThrow();
});
