import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { migrateSources } from "../src/migration/migrate";
import { parseFile, playFile, backupFile } from "../src/files/formats";
import {
  buildImport,
  duplicatePlay,
  entityIds,
  importRows,
} from "../src/files/import-plan";
import { validateLibrary } from "../src/model/validate";
const make = () =>
  migrateSources(
    readFileSync("sources/index_original.html", "utf8"),
    readFileSync("sources/stack_user_v2.json", "utf8"),
  );

test("fichier éditable : roundtrip des six systèmes, branches, possession et versions", () => {
  const lib = make();
  for (const p of lib.plays) {
    const incoming = parseFile(playFile(p));
    expect(incoming.kind).toBe("play");
    if (incoming.kind === "play") expect(incoming.play).toEqual(p);
  }
  const bare = parseFile(JSON.stringify(lib.plays[0]));
  expect(bare.legacy).toBe(true);
});

test("sauvegarde complète : profil/préférences/collections conservés et ancien JSON reconnu", () => {
  const lib = make();
  lib.librarySchemaVersion = 2;
  lib.profile = { coachName: "Coach", team: "OWLS" };
  lib.preferences = {
    courtPreview: "full",
    exportOrientation: "landscape",
    includeNotes: false,
    pngScale: 3,
  };
  const incoming = parseFile(backupFile(lib));
  expect(incoming.kind).toBe("backup");
  if (incoming.kind === "backup") expect(incoming.library).toEqual(lib);
  expect(parseFile(JSON.stringify(lib)).legacy).toBe(true);
  const restored = buildImport(make(), incoming, {}, "restore");
  expect({ ...restored, revision: lib.revision }).toEqual(lib);
});

test("annulation et refus de conflit ne modifient jamais la bibliothèque", () => {
  const lib = make();
  const before = structuredClone(lib);
  const incoming = parseFile(
    playFile({ ...lib.plays[0], name: "Nouvelle version", revision: 2 }),
  );
  expect(importRows(lib, incoming)[0].status).toBe("conflict");
  expect(() => buildImport(lib, incoming, {})).toThrow();
  expect(() => buildImport(lib, incoming, { princeton: "cancel" })).toThrow();
  expect(lib).toEqual(before);
  const replacement = buildImport(lib, incoming, { princeton: "replace" });
  expect(replacement.plays[0].name).toBe("Nouvelle version");
  expect(replacement.plays).toHaveLength(8);
  expect(lib).toEqual(before);
});

test("conserver les deux et duplication : tous les IDs et les références internes sont recâblés", () => {
  const lib = make();
  const p = lib.plays[1],
    copy = duplicatePlay(p);
  expect(entityIds(copy).some((id) => entityIds(p).includes(id))).toBe(false);
  expect(copy.branches[0].forkStepId).toBe(copy.commonSteps[1].id);
  expect(copy.branches[0].steps[0].afterState).toEqual(
    p.branches[0].steps[0].afterState,
  );
  expect(copy.revision).toBe(1);
  const incoming = parseFile(playFile({ ...p, name: "Version entrante" }));
  const both = buildImport(lib, incoming, { [p.id]: "copy" });
  expect(both.plays).toHaveLength(9);
  expect(both.plays.find((x) => x.id === p.id)).toEqual(p);
  validateLibrary(both);
});

test("fusion de sauvegarde : collections par référence, préférences locales gardées par défaut", () => {
  const lib = make(),
    other = structuredClone(lib);
  other.plays[1].name = "Version visiteur";
  other.collections[0].name = "Collection visiteur";
  other.librarySchemaVersion = 2;
  other.profile = { coachName: "Visiteur", team: "Autre" };
  other.preferences.exportOrientation = "landscape";
  const incoming = parseFile(backupFile(other));
  const next = buildImport(lib, incoming, { [other.plays[1].id]: "copy" });
  expect(next.plays).toHaveLength(9);
  expect(next.profile).toBeUndefined();
  expect(next.preferences).toEqual(lib.preferences);
  const importedCollection = next.collections.find(
    (c) => c.name === "Collection visiteur",
  )!;
  expect(importedCollection.id).not.toBe(other.collections[0].id);
  expect(importedCollection.playIds[1]).not.toBe(other.plays[1].id);
  expect(next.plays.some((p) => p.id === importedCollection.playIds[1])).toBe(
    true,
  );
});

test("collisions internes avec un autre système : remplacement interdit, copie possible", () => {
  const lib = make();
  const foreign = {
    ...structuredClone(lib.plays[0]),
    id: "different-id",
    name: "Autre ID, mêmes étapes",
  };
  const incoming = parseFile(playFile(foreign));
  expect(importRows(lib, incoming)[0].internalCollision).toBe(true);
  expect(() =>
    buildImport(lib, incoming, { "different-id": "replace" }),
  ).toThrow("identifiants");
  expect(
    buildImport(lib, incoming, { "different-id": "copy" }).plays,
  ).toHaveLength(9);
});

test("fichiers hostiles, tronqués, versions futures, trop grands et logos actifs refusés", () => {
  for (const raw of [
    "<script>alert(1)</script>",
    "{",
    '{"__proto__":{}}',
    '{"format":"coachos-play","fileSchemaVersion":99,"exportedAt":"2026-11-15T00:00:00.000Z","play":{}}',
  ])
    expect(() => parseFile(raw)).toThrow();
  expect(() => parseFile(" ".repeat(4_000_001))).toThrow("volumineux");
  const lib = make();
  lib.librarySchemaVersion = 2;
  lib.profile = {
    coachName: "Test",
    team: "Test",
    logoDataUrl: "data:image/svg+xml;base64,PHN2Zy8+",
  };
  expect(() => backupFile(lib)).toThrow("Logo");
  const broken = make();
  broken.collections[0].playIds = ["absent"];
  expect(() => backupFile(broken)).toThrow();
  const point = make();
  point.plays[0].initialState.players["1"] = [Infinity, 0];
  expect(() => playFile(point.plays[0])).toThrow();
});
