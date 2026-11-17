import { test, expect, type Page } from "@playwright/test";
// Exercise the actual production default rather than the all-plays regression fixture.
test.use({ storageState: { cookies: [], origins: [] } });
async function ready(page: Page) {
  await expect(page.locator(".storage-line")).toContainText(
    "Enregistré sur cet appareil",
  );
}
async function point(page: Page, x: number, y: number) {
  const svg = page.locator(".editor-surface > svg");
  await svg.scrollIntoViewIfNeeded();
  const q = await svg.evaluate(
    (el, xy) => {
      const p = new DOMPoint(...xy).matrixTransform(
        (el as SVGSVGElement).getScreenCTM()!,
      );
      return { x: p.x, y: p.y };
    },
    [x, y] as [number, number],
  );
  await page.mouse.click(q.x, q.y);
}
test("Mes plays par défaut, copie complète depuis Exemples et séparation persistante", async ({
  page,
}) => {
  await page.goto("");
  await ready(page);
  await expect(page.locator(".play-card")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Mes plays (0)", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Voir les exemples", exact: true })
    .click();
  await expect(page.locator(".play-card")).toHaveCount(8);
  const card = page.locator(".play-card").filter({
    has: page.getByRole("heading", { name: "Pin Down Iso", exact: true }),
  });
  await card.locator(".card-menu > summary").click();
  await card
    .getByRole("button", { name: "Copier dans mes plays", exact: true })
    .click();
  await ready(page);
  await expect(page.locator(".play-card")).toHaveCount(1);
  await page.reload();
  await ready(page);
  await expect(page.locator(".play-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Exemples (8)", exact: true }).click();
  await expect(page.locator(".play-card")).toHaveCount(8);
  await page
    .getByRole("button", { name: "Tous les plays (9)", exact: true })
    .click();
  await expect(page.locator(".play-card")).toHaveCount(9);
});
test("outils proposés dès Placement, annulation, étape suivante et courbe", async ({
  page,
}) => {
  await page.goto("");
  await ready(page);
  await page
    .getByRole("button", { name: "+ Nouveau système", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Nom du nouveau système" })
    .fill("Tous les tracés");
  await page
    .getByRole("button", { name: "Créer le système", exact: true })
    .click();
  await ready(page);
  const select = page.getByRole("combobox", {
    name: "Type de tracé",
    exact: true,
  });
  await expect(select.locator("option")).toHaveCount(7);
  await select.selectOption("line");
  await point(page, 375, 440);
  await point(page, 300, 300);
  await ready(page);
  await expect(page.locator('[data-layer="paths"] > g')).toHaveCount(1);
  await page.getByRole("button", { name: "↶ Annuler", exact: true }).click();
  await ready(page);
  await expect(page.locator('[data-layer="paths"] > g')).toHaveCount(0);
  await select.selectOption("screen-static");
  await point(page, 375, 440);
  await ready(page);
  await expect(page.locator('[data-layer="screens"] > path')).toHaveCount(1);
  await page.getByRole("button", { name: "+ Étape", exact: true }).click();
  await select.selectOption("curve");
  await point(page, 650, 110);
  await point(page, 550, 250);
  await point(page, 600, 400);
  await ready(page);
  await expect(page.locator('[data-layer="paths"] > g')).toHaveCount(1);
  await page.reload();
  await ready(page);
  await expect(page.locator('[data-layer="paths"] > g')).toHaveCount(1);
  await page.getByRole("button", { name: "+ Étape", exact: true }).click();
  await select.selectOption("screen-line");
  await point(page, 491, 310);
  await point(page, 470, 280);
  await ready(page);
  await expect(page.locator('[data-layer="paths"] > g > path')).toHaveCount(2);
  await page.getByRole("button", { name: "+ Étape", exact: true }).click();
  await select.selectOption("screen-curve");
  await point(page, 259, 310);
  await point(page, 200, 200);
  await point(page, 160, 120);
  await ready(page);
  await expect(page.locator('[data-layer="paths"] > g > path')).toHaveCount(2);
});

test("reprise d’une bibliothèque ancienne : contenu modifié conservé et appartenance persistée", async ({
  page,
}) => {
  await page.goto("");
  await ready(page);
  const original = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open("coachos", 1);
      r.onsuccess = () => resolve(r.result);
    });
    const lib = await new Promise<import("../src/model/types").Library>(
      (resolve) => {
        const tx = db.transaction("library"),
          r = tx.objectStore("library").get("current");
        tx.oncomplete = () => resolve(r.result);
      },
    );
    db.close();
    return lib;
  });
  const legacy = {
    ...structuredClone(original),
    librarySchemaVersion: 2 as const,
  };
  delete legacy.examplePlayIds;
  legacy.plays[0].metadata.description = "Mon adaptation sauvegardée";
  await page.evaluate(async (lib) => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open("coachos", 1);
      r.onsuccess = () => resolve(r.result);
    });
    await new Promise<void>((resolve) => {
      const tx = db.transaction("library", "readwrite");
      tx.objectStore("library").put(lib, "current");
      tx.oncomplete = () => resolve();
    });
    db.close();
  }, legacy);
  await page.reload();
  await ready(page);
  await expect(page.locator(".play-card")).toHaveCount(1);
  await expect(page.locator(".play-card")).toContainText(
    "Mon adaptation sauvegardée",
  );
  await expect(
    page.getByRole("button", { name: "Exemples (7)", exact: true }),
  ).toBeVisible();
  const loaded = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open("coachos", 1);
      r.onsuccess = () => resolve(r.result);
    });
    const lib = await new Promise<import("../src/model/types").Library>(
      (resolve) => {
        const tx = db.transaction("library"),
          r = tx.objectStore("library").get("current");
        tx.oncomplete = () => resolve(r.result);
      },
    );
    db.close();
    return lib;
  });
  expect(loaded.librarySchemaVersion).toBe(3);
  expect(loaded.revision).toBe(legacy.revision + 1);
  expect(loaded.plays).toEqual(legacy.plays);
  expect(loaded.collections).toEqual(legacy.collections);
  await page.reload();
  await ready(page);
  await expect(page.locator(".play-card")).toHaveCount(1);
});
