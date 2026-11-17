import { test, expect, type Page } from "@playwright/test";
async function ready(page: Page) {
  await expect(page.locator(".storage-line")).toContainText(
    "Enregistré sur cet appareil",
  );
}
async function library(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open("coachos", 1);
      r.onsuccess = () => resolve(r.result);
    });
    const value = await new Promise<import("../src/model/types").Library>(
      (resolve) => {
        const tx = db.transaction("library"),
          r = tx.objectStore("library").get("current");
        tx.oncomplete = () => resolve(r.result);
      },
    );
    db.close();
    return value;
  });
}
async function menu(page: Page, name: string) {
  const card = page
    .locator(".play-card")
    .filter({ has: page.getByRole("heading", { name, exact: true }) });
  await card.locator(".card-menu > summary").click();
  return card;
}
test("suppression annulée, complète et restaurable avec ses collections", async ({
  page,
}) => {
  await page.goto("");
  await ready(page);
  const before = await library(page);
  const target = before.plays.find((p) => p.name === "Pin Down Iso")!;
  expect(target.branches.length).toBe(4);
  let card = await menu(page, target.name);
  page.once("dialog", async (d) => {
    expect(d.message()).toContain(target.name);
    await d.dismiss();
  });
  await card
    .getByRole("button", { name: "Supprimer le play", exact: true })
    .click();
  expect(await library(page)).toEqual(before);
  page.once("dialog", (d) => d.accept());
  await card
    .getByRole("button", { name: "Supprimer le play", exact: true })
    .click();
  await expect(card).toHaveCount(0);
  await ready(page);
  const removed = await library(page);
  expect(removed.plays).toEqual(before.plays.filter((p) => p.id !== target.id));
  expect(removed.collections).toEqual(
    before.collections.map((c) => ({
      ...c,
      playIds: c.playIds.filter((id) => id !== target.id),
    })),
  );
  await page
    .getByRole("button", {
      name: "Annuler la suppression de Pin Down Iso",
      exact: true,
    })
    .click();
  await ready(page);
  await expect(page.locator(".play-card")).toHaveCount(before.plays.length);
  const restored = await library(page);
  expect(restored.plays).toEqual(before.plays);
  expect(restored.collections).toEqual(before.collections);
  card = await menu(page, target.name);
  page.once("dialog", (d) => d.accept());
  await card
    .getByRole("button", { name: "Supprimer le play", exact: true })
    .click();
  await expect(card).toHaveCount(0);
  const undo = page.getByRole("button", {
    name: "Annuler la suppression de Pin Down Iso",
    exact: true,
  });
  await expect(undo).toBeFocused();
  const box = await undo.boundingBox();
  expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await page.getByText("Gérer les collections", { exact: true }).click();
  await page
    .getByRole("textbox", { name: "Nom de la collection", exact: true })
    .fill("Après suppression");
  await page
    .getByRole("button", { name: "Créer la collection", exact: true })
    .click();
  await ready(page);
  await expect(undo).toHaveCount(0);
  expect(
    (await library(page)).collections.some(
      (c) => c.name === "Après suppression",
    ),
  ).toBe(true);
  await page.reload();
  await ready(page);
  expect((await library(page)).plays.some((p) => p.id === target.id)).toBe(
    false,
  );
});
test("quota : aucune suppression ni fausse annulation disponible", async ({
  page,
}) => {
  await page.goto("");
  await ready(page);
  const before = await library(page);
  const card = await menu(page, "Princeton");
  await page.evaluate(() => {
    IDBObjectStore.prototype.put = function () {
      throw new DOMException("Quota plein", "QuotaExceededError");
    };
  });
  page.once("dialog", (d) => d.accept());
  await card
    .getByRole("button", { name: "Supprimer le play", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Quota");
  expect(await library(page)).toEqual(before);
  await expect(
    page.getByRole("button", { name: /Annuler la suppression/ }),
  ).toHaveCount(0);
  await expect(card).toBeVisible();
});
test("suppression du dernier play en anglais : bibliothèque vide persistante et création possible", async ({
  page,
}) => {
  await page.goto("");
  await ready(page);
  const before = await library(page);
  await page
    .getByRole("combobox", { name: "Langue de l’interface" })
    .selectOption("en");
  for (const p of before.plays) {
    const card = await menu(page, p.name);
    page.once("dialog", async (d) => {
      expect(d.message()).toContain("all its steps and reads");
      await d.accept();
    });
    await card
      .getByRole("button", { name: "Delete play", exact: true })
      .click();
    await expect(card).toHaveCount(0);
  }
  await page.reload();
  await expect(page.locator(".storage-line")).toContainText(
    "Saved on this device",
  );
  expect((await library(page)).plays).toEqual([]);
  await expect(
    page.getByRole("heading", { name: "No plays found", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "+ New play", exact: true }).click();
  await page.getByRole("textbox", { name: "New play name" }).fill("Restart");
  await page.getByRole("button", { name: "Create play", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Restart", exact: true }),
  ).toBeVisible();
});
