import { expect, test, type Page, type Download } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import AxeBuilder from "@axe-core/playwright";
async function ready(page: Page, english = false) {
  await expect(page.locator(".storage-line")).toContainText(
    english ? "Saved on this device" : "Enregistré sur cet appareil",
  );
}
async function library(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const req = indexedDB.open("coachos", 1);
      req.onsuccess = () => resolve(req.result);
    });
    const value = await new Promise<import("../src/model/types").Library>(
      (resolve) => {
        const tx = db.transaction("library");
        const req = tx.objectStore("library").get("current");
        tx.oncomplete = () => resolve(req.result);
      },
    );
    db.close();
    return value;
  });
}
const bytes = async (download: Download) => readFile((await download.path())!);
test("anglais persistant, tuto et filtres utilisables sans modifier les systèmes", async ({
  page,
}) => {
  await page.goto("");
  await ready(page);
  const before = await library(page);
  await page
    .getByRole("combobox", { name: "Langue de l’interface" })
    .selectOption("en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page).toHaveTitle("CoachOS · Library");
  await page
    .getByRole("combobox", { name: "Filter plays", exact: true })
    .selectOption({ label: "Inbound" });
  await expect(page.locator(".play-card")).toHaveCount(2);
  await expect(page.locator(".play-card h3")).toHaveText([
    "SLOB Stagger Elevator",
    "Baseline",
  ]);
  await page
    .getByRole("combobox", { name: "Filter plays", exact: true })
    .selectOption({ label: "All plays" });
  await page
    .getByLabel("CoachOS file to import", { exact: true })
    .setInputFiles({
      name: "invalid.coachos",
      mimeType: "application/json",
      buffer: Buffer.from("{"),
    });
  await expect(page.getByRole("alert")).toContainText(
    "Invalid CoachOS data: unreadable JSON.",
  );
  expect(await library(page)).toEqual(before);
  await page.getByRole("link", { name: "Tutorial", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Get started with CoachOS" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Save and export", exact: true })
    .click();
  await expect(
    page.getByText(
      "includes all steps and alternative reads, with the court taking priority and at most two lines of instructions per diagram.",
      { exact: false },
    ),
  ).toBeVisible();
  await page
    .getByText("Try the gestures on a practice court", { exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Move player 2", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Practice court", exact: true }),
  ).toContainText("Try moving a player");
  const a11y = await new AxeBuilder({ page }).analyze();
  expect(a11y.violations).toEqual([]);
  await expect(page.locator(".offline-status summary")).toContainText(
    "Available offline",
  );
  await page.context().setOffline(true);
  await page.reload();
  await ready(page, true);
  await expect(page).toHaveTitle("CoachOS · Tutorial");
  expect(await library(page)).toEqual(before);
  await page
    .getByRole("combobox", { name: "Interface language" })
    .selectOption("fr");
  await expect(page).toHaveTitle("CoachOS · Tuto");
  expect(await library(page)).toEqual(before);
});

test("export direct : étape courante, PDF complet, langue sans perte et présentation en pause", async ({
  page,
}) => {
  await page.goto("");
  await ready(page);
  await page
    .getByRole("button", { name: "+ Nouveau système", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Nom du nouveau système" })
    .fill("Consigne française conservée");
  await page
    .getByRole("button", { name: "Créer le système", exact: true })
    .click();
  await ready(page);
  await page.getByRole("button", { name: "+ Étape", exact: true }).click();
  await ready(page);
  await page.getByText("Notes ·", { exact: false }).click();
  await page
    .getByRole("textbox", { name: "Titre de l’étape" })
    .fill("Courbe au poste haut");
  await page
    .getByRole("textbox", { name: "Notes de l’étape" })
    .fill("Rester patient, puis couper.");
  await page.getByRole("textbox", { name: "Notes de l’étape" }).blur();
  await ready(page);
  const before = await library(page);
  await page.getByText("Réglages", { exact: true }).click();
  await page
    .getByRole("combobox", { name: "Langue de l’interface" })
    .selectOption("en");
  await page.getByText("Settings", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Draw", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Step title" })).toHaveValue(
    "Courbe au poste haut",
  );
  expect(await library(page)).toEqual(before);
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText(
    "2 shared steps · 0 reads · 2 steps in total",
  );
  const originalViewport = page.viewportSize()!;
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const rect = await dialog.boundingBox();
    expect(rect!.x).toBeGreaterThanOrEqual(0);
    expect(rect!.x + rect!.width).toBeLessThanOrEqual(width + 1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  }
  await page.setViewportSize(originalViewport);
  let pending = page.waitForEvent("download");
  await dialog.getByText("Current step only", { exact: true }).click();
  await dialog
    .getByRole("button", { name: "Download this step as PNG", exact: true })
    .click();
  const png = await pending;
  expect(png.suggestedFilename()).toContain("Courbe-au-poste-haut");
  expect((await bytes(png)).subarray(1, 4).toString()).toBe("PNG");
  await expect(dialog).toContainText("Your file is ready.");
  await expect(dialog).toContainText("browser’s downloads");
  const a11y = await new AxeBuilder({ page }).analyze();
  expect(a11y.violations).toEqual([]);
  pending = page.waitForEvent("download");
  await dialog.getByRole("button", { name: /Full play PDF/ }).click();
  expect(
    (await PDFDocument.load(await bytes(await pending))).getPageCount(),
  ).toBe(2);
  await dialog.getByRole("button", { name: "Close export" }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await expect(
    dialog.getByText("Your file is ready.", { exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Play step", exact: true }).click();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page.getByRole("button", { name: "Close export" }).click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toHaveCount(0);
  expect(await library(page)).toEqual(before);
});

test("export sur la carte et sélection limitée aux résultats visibles", async ({
  page,
}) => {
  await page.goto("");
  await ready(page);
  await expect(
    page.getByRole("checkbox", { name: "Sélectionner Princeton", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Exporter Princeton", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "11 étapes communes · 0 lectures · 11 étapes au total",
  );
  await page.getByRole("button", { name: "Fermer l’export" }).click();
  await page.getByRole("searchbox").fill("Princeton");
  await page
    .getByRole("button", { name: "Exporter en PDF ou image", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Sélectionner les résultats (1)",
      exact: true,
    })
    .click();
  await expect(page.locator(".export-selection")).toContainText(
    "1 systèmes sélectionnés",
  );
  await page
    .getByRole("button", { name: "Toute la bibliothèque (8)", exact: true })
    .click();
  await expect(page.locator(".export-selection")).toContainText(
    "8 systèmes sélectionnés",
  );
});
