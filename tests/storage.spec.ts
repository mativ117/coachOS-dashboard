import "fake-indexeddb/auto";
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { migrateSources } from "../src/migration/migrate";
import { LibraryRepository } from "../src/storage/repository";
const make = () =>
  migrateSources(
    readFileSync("sources/index_original.html", "utf8"),
    readFileSync("sources/stack_user_v2.json", "utf8"),
  );
test.beforeEach(async () => {
  await new Promise<void>((resolve, reject) => {
    const r = indexedDB.deleteDatabase("coachos");
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
});

test("sauvegarder, fermer, rouvrir : positions, notes, branches, collections et préférences conservées", async () => {
  let repo = await LibraryRepository.open();
  const original = make();
  await repo.save(original, null);
  repo.close();
  repo = await LibraryRepository.open();
  expect(await repo.read()).toEqual(original);
  const edited = structuredClone(original);
  edited.revision++;
  edited.preferences.courtPreview = "full";
  edited.plays[0].commonSteps[1].note = "Note locale à conserver";

  await repo.save(edited, original.revision);
  repo.close();
  repo = await LibraryRepository.open();
  expect(await repo.read()).toEqual(edited);
  repo.close();
});

test("conflits de révision : un second onglet et une seconde initialisation ne remplacent rien", async () => {
  const a = await LibraryRepository.open(),
    b = await LibraryRepository.open();
  const initial = make();
  await a.save(initial, null);
  await expect(b.save(initial, null)).rejects.toThrow("autre onglet");
  const next = {
    ...initial,
    revision: 2,
    preferences: { courtPreview: "full" as const },
  };
  await a.save(next, 1);
  await expect(b.save({ ...initial, revision: 2 }, 1)).rejects.toThrow(
    "autre onglet",
  );
  expect(await a.read()).toEqual(next);
  a.close();
  b.close();
});

test("quota et modèle invalide : transaction annulée, ancienne bibliothèque intacte", async () => {
  const repo = await LibraryRepository.open();
  const initial = make();
  await repo.save(initial, null);
  const oldPut = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function () {
    throw new DOMException("Quota plein", "QuotaExceededError");
  };
  try {
    await expect(repo.save({ ...initial, revision: 2 }, 1)).rejects.toThrow(
      "Quota plein",
    );
  } finally {
    IDBObjectStore.prototype.put = oldPut;
  }
  expect(await repo.read()).toEqual(initial);
  const invalid = structuredClone(initial);
  invalid.revision = 2;
  invalid.collections[0].playIds = ["missing"];
  await expect(async () => repo.save(invalid, 1)).rejects.toThrow();
  expect(await repo.read()).toEqual(initial);
  repo.close();
});
