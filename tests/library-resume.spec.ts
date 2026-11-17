import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test.use({ storageState: { cookies: [], origins: [] } });
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
test("reprendre au bon endroit et retrouver sa recherche sans changer les données", async ({
  page,
}) => {
  await page.goto("");
  await ready(page);
  await page
    .getByRole("button", { name: "+ Nouveau système", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Nom du nouveau système" })
    .fill("Alpha reprise");
  await page
    .getByRole("button", { name: "Créer le système", exact: true })
    .click();
  await page.getByRole("button", { name: "+ Étape", exact: true }).click();
  await ready(page);
  const before = await library(page),
    play = before.plays.find((p) => p.name === "Alpha reprise")!;
  await page.getByRole("link", { name: "Bibliothèque", exact: true }).click();
  await page.getByRole("searchbox").fill("Alpha");
  const resume = page.getByRole("link", {
    name: "Reprendre Alpha reprise",
    exact: true,
  });
  await expect(resume).toHaveAttribute(
    "href",
    new RegExp(play.commonSteps[1].id),
  );
  await resume.click();
  await expect(
    page.locator(".timeline-steps [aria-current=step]"),
  ).toContainText("Nouvelle étape");
  await page
    .getByRole("button", { name: "Étape précédente", exact: true })
    .click();
  await page.getByRole("link", { name: "Bibliothèque", exact: true }).click();
  await expect(page.getByRole("searchbox")).toHaveValue("Alpha");
  await expect(resume).toHaveAttribute(
    "href",
    new RegExp(play.commonSteps[0].id),
  );
  await page.reload();
  await ready(page);
  await expect(page.getByRole("searchbox")).toHaveValue("Alpha");
  expect(await library(page)).toEqual(before);
  await page
    .getByRole("button", { name: "Effacer les filtres", exact: true })
    .click();
  await expect(page.getByRole("searchbox")).toHaveValue("");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
test("lecture alternative mémorisée et tri des plays sans mélange avec les exemples", async ({
  page,
}) => {
  await page.goto("");
  await ready(page);
  await page
    .getByRole("button", { name: "Voir les exemples", exact: true })
    .click();
  const card = page.locator(".play-card").filter({
    has: page.getByRole("heading", { name: "Pin Down Iso", exact: true }),
  });
  await card.locator(".card-menu > summary").click();
  await card
    .getByRole("button", { name: "Copier dans mes plays", exact: true })
    .click();
  await ready(page);
  const lib = await library(page),
    copy = lib.plays.find((p) => !lib.examplePlayIds!.includes(p.id))!,
    branch = copy.branches[1];
  await page
    .getByRole("link", { name: `Ouvrir ${copy.name}`, exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Choisir la lecture" })
    .selectOption(branch.id);
  await page.locator(".timeline-steps button").last().click();
  await page.getByRole("link", { name: "Bibliothèque", exact: true }).click();
  const resume = page.getByRole("link", {
    name: `Reprendre ${copy.name}`,
    exact: true,
  });
  await expect(resume).toHaveAttribute("href", new RegExp(branch.id));
  await resume.click();
  await expect(
    page.getByRole("combobox", { name: "Choisir la lecture" }),
  ).toHaveValue(branch.id);
  await expect(
    page.locator(".timeline-steps [aria-current=step]"),
  ).toContainText(branch.steps.at(-1)!.title);
  await page.getByRole("link", { name: "Bibliothèque", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Trier les plays" })
    .selectOption("name");
  await page.reload();
  await ready(page);
  await expect(
    page.getByRole("combobox", { name: "Trier les plays" }),
  ).toHaveValue("name");
  await expect(page.locator(".play-card")).toHaveCount(1);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  }
});
