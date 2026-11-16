import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { PDFDocument, PDFName, PDFDict } from "pdf-lib";
import { unzipSync } from "fflate";
import type { Library } from "../src/model/types";
import { safeName } from "../src/files/formats";
async function saved(page: Page) {
  await expect(page.locator(".storage-line")).toContainText(
    "Enregistré sur cet appareil",
  );
}
async function library(page: Page): Promise<Library> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open("coachos", 1);
      r.onsuccess = () => resolve(r.result);
    });
    const value = await new Promise<Library>((resolve) => {
      const tx = db.transaction("library"),
        r = tx.objectStore("library").get("current");
      tx.oncomplete = () => resolve(r.result);
    });
    db.close();
    return value;
  });
}
test("play complet : chaque étape et chaque lecture en PNG ZIP hors ligne et en PDF visuel", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.goto("");
  await saved(page);
  const before = await library(page),
    play = before.plays.find((p) => p.name === "Pin Down Iso")!;
  const steps = [...play.commonSteps, ...play.branches.flatMap((b) => b.steps)];
  expect(play.branches.length).toBe(4);
  await expect(page.locator(".offline-status summary")).toContainText(
    "Disponible hors ligne",
  );
  await page.reload();
  await saved(page);
  await page.context().setOffline(true);
  await page
    .getByRole("button", { name: "Exporter Pin Down Iso", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText(`${steps.length} étapes au total`);
  let pending = page.waitForEvent("download", { timeout: 90000 });
  await dialog.getByRole("button", { name: /Tous les visuels PNG/ }).click();
  const zipDownload = await pending;
  expect(zipDownload.suggestedFilename()).toBe("Pin-Down-Iso-images.zip");
  const files = unzipSync(await readFile((await zipDownload.path())!));
  const names = Object.keys(files);
  expect(names).toHaveLength(steps.length);
  for (const [i, step] of steps.entries()) {
    const name = `01-Pin-Down-Iso/${String(i + 1).padStart(3, "0")}-${safeName(step.title)}.png`;
    expect(names).toContain(name);
    expect(Buffer.from(files[name]).subarray(1, 4).toString()).toBe("PNG");
  }
  pending = page.waitForEvent("download", { timeout: 90000 });
  await dialog.getByRole("button", { name: /PDF du système/ }).click();
  const pdf = await PDFDocument.load(
    await readFile((await (await pending).path())!),
  );
  expect(pdf.getPageCount()).toBe(steps.length);
  for (const p of pdf.getPages()) {
    const objects = p.node.Resources()!.lookup(PDFName.of("XObject"), PDFDict);
    expect(objects.keys().length).toBeGreaterThanOrEqual(2); // header and court, even when a caption is present
  }
  await dialog.getByRole("button", { name: "Fermer l’export" }).click();
  await page
    .getByRole("button", { name: "Exporter en PDF ou image", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Toute la bibliothèque (8)", exact: true })
    .click();
  pending = page.waitForEvent("download", { timeout: 90000 });
  await page
    .getByRole("button", { name: "PDF de la sélection", exact: true })
    .click();
  const complete = await PDFDocument.load(
    await readFile((await (await pending).path())!),
  );
  const total = before.plays.reduce(
    (n, p) =>
      n +
      Math.max(
        1,
        p.commonSteps.length +
          p.branches.reduce((m, b) => m + b.steps.length, 0),
      ),
    0,
  );
  expect(complete.getPageCount()).toBe(total);
  expect(await library(page)).toEqual(before);
});
