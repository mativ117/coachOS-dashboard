import { expect, test } from "@playwright/test";

test("bibliothèque, recherche, filtres et état vide", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("");
  await expect(page).toHaveTitle("CoachOS · Bibliothèque");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "La bibliothèque",
  );
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
  await expect(page.getByRole("article")).toHaveCount(8);
  await page
    .getByRole("combobox", { name: "Filtrer les systèmes" })
    .selectOption("Brouillons");
  await expect(page.getByRole("article")).toHaveCount(2);
  expect(errors).toEqual([]);
});

test("parcours des trois espaces, sélection du système et historique", async ({
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
  await expect(
    page.getByRole("link", { name: "Éditeur", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByText("Terrain de démonstration.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Présenter", exact: true }).click();
  await expect(page).toHaveTitle("CoachOS · Présentation");
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Retour à l’éditeur" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Stagger Elevator",
  );
  await page.goBack();
  await expect(page).toHaveTitle("CoachOS · Éditeur");
  await page.getByRole("link", { name: "Bibliothèque", exact: true }).click();
  await expect(page.getByRole("article")).toHaveCount(8);
});

test("terrain accessible demi/entier et aucune largeur débordante", async ({
  page,
}) => {
  await page.goto("#/editor?play=stack");
  const court = page.getByRole("img");
  await expect(court).toHaveAttribute("viewBox", "-35 -35 1570 1470");
  await expect(court).toHaveAccessibleName(/Demi-terrain.*cinq joueurs/);
  await page
    .getByRole("button", { name: "Terrain entier", exact: true })
    .click();
  await expect(court).toHaveAttribute("viewBox", "-35 -35 1570 2870");
  await expect(court).toHaveAccessibleName(/Terrain entier/);
  await expect(
    page.getByRole("button", { name: "Terrain entier", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".court-player")).toHaveCount(5);
  await page.getByRole("button", { name: "Demi-terrain", exact: true }).click();
  await expect(court).toHaveAttribute("viewBox", "-35 -35 1570 1470");
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

test("accès clavier au contenu et routes inconnues", async ({ page }) => {
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
  // Le lien d'évitement ne doit pas modifier la route de l'application.
  await expect(page).toHaveURL(/#\/inconnu\?play=absent$/);
});
