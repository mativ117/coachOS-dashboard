import { expect, test } from "@playwright/test";

test("bibliothèque migrée, recherche, collections, filtres et état vide", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("");
  await expect(
    page.getByText("Enregistré sur cet appareil", { exact: false }),
  ).toBeVisible();
  await expect(page).toHaveTitle("CoachOS · Bibliothèque");
  await expect(page.getByRole("article")).toHaveCount(8);
  await page.getByRole("searchbox").fill("stack");
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "Stack — Multi-lectures" }),
  ).toBeVisible();
  await page.getByRole("searchbox").fill("aucun résultat");
  await expect(page.getByText("Aucun système trouvé")).toBeVisible();
  await page
    .getByRole("button", { name: "Réinitialiser la recherche" })
    .click();
  await page
    .getByRole("combobox", { name: "Filtrer les collections" })
    .selectOption("owls");
  await expect(page.getByRole("article")).toHaveCount(5);
  await page
    .getByRole("combobox", { name: "Filtrer les collections" })
    .selectOption("all");
  await page
    .getByRole("combobox", { name: "Filtrer les systèmes" })
    .selectOption("Brouillons");
  await expect(page.getByRole("article")).toHaveCount(2);
  expect(errors).toEqual([]);
});

test("trois espaces, notes, étapes, sélection et historique", async ({
  page,
}) => {
  await page.goto("");
  await page
    .getByRole("link", { name: "Ouvrir Stagger Elevator", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/editor\?play=stagger-elevator$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Stagger Elevator",
  );
  await page.getByRole("button", { name: "Suivante →", exact: true }).click();
  await expect(
    page.locator(".timeline-steps [aria-current=step]"),
  ).toContainText("Premier écran de 4");
  await expect(page.locator('[data-layer="screens"] path')).toHaveCount(1);
  await page.getByRole("link", { name: "Présenter", exact: true }).click();
  await expect(page).toHaveTitle("CoachOS · Présentation");
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Stagger Elevator",
  );
  await page.goBack();
  await expect(page).toHaveTitle("CoachOS · Éditeur");
  await page.getByRole("link", { name: "Bibliothèque", exact: true }).click();
  await expect(page.getByRole("article")).toHaveCount(8);
});

test("préférence de gabarit persistée, retour source et aucune largeur débordante", async ({
  page,
}) => {
  await page.goto("#/presentation?play=stack");
  await expect(
    page.getByText("Enregistré sur cet appareil", { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole("img")).toHaveAccessibleName(
    /coordonnées source/,
  );
  await page
    .getByRole("button", { name: "Gabarit entier", exact: true })
    .click();
  await expect(page.getByRole("img")).toHaveAttribute(
    "viewBox",
    "-35 -35 1570 2870",
  );
  await expect(
    page.getByText("Enregistré sur cet appareil", { exact: false }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Gabarit entier", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("img")).toHaveAttribute(
    "viewBox",
    "-35 -35 1570 2870",
  );
  await page.getByRole("button", { name: "Vue source", exact: true }).click();
  await expect(page.locator('[data-layer="players"] > g')).toHaveCount(5);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("accès clavier et routes inconnues", async ({ page }) => {
  await page.goto("#/inconnu?play=absent");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "La bibliothèque",
  );
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Aller au contenu" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  await expect(page).toHaveURL(/#\/inconnu\?play=absent$/);
});

test("échec IndexedDB visible et export JSON de secours disponible", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "indexedDB", {
      get() {
        throw new DOMException("Stockage désactivé", "SecurityError");
      },
    }),
  );
  await page.goto("");
  await expect(page.getByRole("alert")).toContainText(
    "La sauvegarde locale n’est pas disponible.",
  );
  await expect(page.getByRole("article")).toHaveCount(8);
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exporter les données affichées (JSON)" })
    .click();
  expect((await download).suggestedFilename()).toBe("coachos-secours.json");
});

test("stockage corrompu conservé, sans initialisation écrasante", async ({
  page,
}) => {
  await page.goto("");
  await expect(
    page.getByText("Enregistré sur cet appareil", { exact: false }),
  ).toBeVisible();
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("coachos", 1);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("library", "readwrite");
      tx.objectStore("library").put(
        { librarySchemaVersion: 99, keep: "ne pas remplacer" },
        "current",
      );
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.reload();
  await expect(page.getByRole("alert")).toContainText(
    "Les données existantes ne sont pas remplacées.",
  );
  const raw = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open("coachos", 1);
      r.onsuccess = () => resolve(r.result);
    });
    const result = await new Promise<unknown>((resolve) => {
      const tx = db.transaction("library");
      const r = tx.objectStore("library").get("current");
      tx.oncomplete = () => resolve(r.result);
    });
    db.close();
    return result;
  });
  expect(raw).toEqual({ librarySchemaVersion: 99, keep: "ne pas remplacer" });
});
