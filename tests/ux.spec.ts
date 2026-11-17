import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
async function ready(page: Page) {
  await expect(page.locator(".storage-line")).toContainText(
    "Enregistré sur cet appareil",
  );
}
async function create(page: Page) {
  await page.goto("");
  await ready(page);
  await page
    .getByRole("button", { name: "+ Nouveau système", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Nom du nouveau système" })
    .fill("UX simple");
  await page
    .getByRole("button", { name: "Créer le système", exact: true })
    .click();
  await page.getByRole("button", { name: "+ Étape", exact: true }).click();
  await ready(page);
}
async function play(page: Page) {
  return page.evaluate(async () => {
    const id = new URLSearchParams(location.hash.split("?")[1]).get("play");
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
    return value.plays.find((p) => p.id === id)!;
  });
}
test("accueil : actions usuelles visibles et informations secondaires à la demande", async ({
  page,
}) => {
  await page.goto("");
  await ready(page);
  await expect(
    page.getByRole("button", { name: "+ Nouveau système", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Exporter en PDF ou image", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Sauvegarder la bibliothèque",
      exact: true,
    }),
  ).not.toBeVisible();
  await expect(page.locator(".library-intro")).not.toHaveAttribute("open", "");
  await page.locator(".library-more > summary").focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", {
      name: "Sauvegarder la bibliothèque",
      exact: true,
    }),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
test("passe : validation au-dessus du terrain et étapes parcourues sans modifier le play", async ({
  page,
}) => {
  await create(page);
  await page.getByRole("button", { name: "Passe", exact: true }).click();
  await page
    .getByRole("button", { name: "Déplacer joueur 1", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Déplacer joueur 2", exact: true })
    .click();
  await ready(page);
  const checkbox = page.getByRole("checkbox", { name: "Exécuter cette passe" }),
    court = page.locator(".editor-surface");
  expect((await checkbox.boundingBox())!.y).toBeLessThan(
    (await court.boundingBox())!.y,
  );
  await expect(
    page.getByRole("combobox", { name: "Acteur du tracé" }),
  ).not.toBeVisible();
  await checkbox.check();
  await ready(page);
  expect((await play(page)).commonSteps[1].afterState.ball).toEqual({
    mode: "attached",
    carrierId: "2",
  });
  const before = await play(page);
  await page
    .getByRole("button", { name: "Étape précédente", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Étape précédente", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Étape suivante", exact: true })
    .click();
  await expect(checkbox).toHaveCount(0); // selection was cleared; the confirmed pass remains in data
  expect(await play(page)).toEqual(before);
});
test("annotation : saisir juste avant le terrain, au clavier, puis placer le texte", async ({
  page,
}) => {
  await create(page);
  await page.getByText("Autres", { exact: true }).click();
  await page.getByRole("button", { name: "Annotation", exact: true }).click();
  const input = page.getByRole("textbox", { name: "Annotation à placer" });
  await expect(input).toBeFocused();
  expect((await input.boundingBox())!.y).toBeLessThan(
    (await page.locator(".editor-surface").boundingBox())!.y,
  );
  await input.fill("Couper ici");
  const svg = page.locator(".editor-surface > svg");
  await svg.scrollIntoViewIfNeeded();
  const p = await svg.evaluate((el) => {
    const q = new DOMPoint(300, 300).matrixTransform(
      (el as SVGSVGElement).getScreenCTM()!,
    );
    return { x: q.x, y: q.y };
  });
  await page.mouse.click(p.x, p.y);
  await ready(page);
  expect((await play(page)).commonSteps[1].actions[0].text).toBe("Couper ici");
  await expect(input).toHaveCount(0);
  await page.getByText("Réglages", { exact: true }).click();
  await page
    .getByRole("combobox", { name: "Langue de l’interface" })
    .selectOption("en");
  await page.getByText("Settings", { exact: true }).click();
  await page.getByText("More", { exact: true }).click();
  await page.getByRole("button", { name: "Note", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Note to place" }),
  ).toBeFocused();
  await expect(page.locator(".annotation-context")).toContainText(
    "Type here, then tap the court to place the text.",
  );
});
