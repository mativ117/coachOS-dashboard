import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
async function ready(page: Page) {
  await expect(page.locator(".storage-line")).toContainText(
    "Enregistré sur cet appareil",
  );
}
async function read(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open("coachos", 1);
      r.onsuccess = () => resolve(r.result);
    });
    const lib = await new Promise<unknown>((resolve) => {
      const tx = db.transaction("library");
      const r = tx.objectStore("library").get("current");
      tx.oncomplete = () => resolve(r.result);
    });
    db.close();
    return lib;
  });
}
async function point(page: Page, x: number, y: number, touch: boolean) {
  const svg = page.locator(".tutorial-practice svg");
  await svg.scrollIntoViewIfNeeded();
  const p = await svg.evaluate(
    (el, xy) => {
      const p = new DOMPoint(...xy).matrixTransform(
        (el as SVGSVGElement).getScreenCTM()!,
      );
      return { x: p.x, y: p.y };
    },
    [x, y] as [number, number],
  );
  if (touch) await page.touchscreen.tap(p.x, p.y);
  else await page.mouse.click(p.x, p.y);
}

test("tuto accessible : gestes du ballon réels et entraînement sans écriture dans la bibliothèque", async ({
  page,
}, info) => {
  await page.goto("");
  await ready(page);
  const before = await read(page);
  await page.getByRole("link", { name: "Tuto", exact: true }).click();
  await expect(page).toHaveTitle("CoachOS · Tuto");
  await expect(
    page.getByRole("heading", { name: "Prendre en main CoachOS", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Déplacer le ballon", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Donner le ballon à un autre joueur" }),
  ).toBeVisible();
  expect(page.url()).toContain("#/tutorial");
  await page
    .getByText("Essayer les gestes sur un terrain d’entraînement", {
      exact: true,
    })
    .click();
  const practice = page.getByRole("region", { name: "Terrain d’entraînement" }),
    touch = info.project.name === "mobile";
  await point(page, 397, 454, touch);
  await point(page, 650, 110, touch);
  await expect(practice.getByRole("status")).toContainText(
    "Le joueur 2 porte maintenant le ballon.",
  );
  await point(page, 650, 110, touch);
  await point(page, 580, 210, touch);
  await expect(
    practice.locator('[data-layer=players] [data-player="2"]'),
  ).toHaveAttribute("transform", "translate(580 210)");
  await expect(practice.locator("[data-layer=ball] circle")).toHaveAttribute(
    "cx",
    "602",
  );
  await point(page, 602, 224, touch);
  await point(page, 400, 500, touch);
  await expect(practice.getByRole("status")).toContainText(
    "Le ballon est libre",
  );
  await practice
    .getByRole("button", { name: "Recommencer", exact: true })
    .click();
  await expect(practice.locator("[data-layer=ball] circle")).toHaveAttribute(
    "cx",
    "397",
  );
  await practice.getByRole("button", { name: "Tracer", exact: true }).click();
  await point(page, 375, 440, touch);
  await point(page, 230, 220, touch);
  await expect(practice.locator("[data-layer=paths] > g")).toHaveCount(1);
  expect(await read(page)).toEqual(before);
  await page.reload();
  await ready(page);
  await page
    .getByText("Essayer les gestes sur un terrain d’entraînement", {
      exact: true,
    })
    .click();
  await expect(
    page.locator(".tutorial-practice [data-layer=paths] > g"),
  ).toHaveCount(0);
  expect(await read(page)).toEqual(before);
});

test("retour du tuto à la lecture et à l’étape courantes de l’éditeur", async ({
  page,
}) => {
  await page.goto("#/editor?play=pin-down-iso");
  await ready(page);
  await page.locator(".timeline-steps button").nth(2).click();
  await expect(page.locator(".timeline-steps button").nth(2)).toHaveAttribute(
    "aria-current",
    "step",
  );
  const before = new URLSearchParams(page.url().split("?")[1]);
  await page.getByRole("link", { name: "Tuto", exact: true }).click();
  await page
    .getByRole("link", { name: "Revenir à mon espace", exact: true })
    .first()
    .click();
  await ready(page);
  const after = new URLSearchParams(page.url().split("?")[1]);
  expect(after.get("play")).toBe(before.get("play"));
  expect(after.get("step")).toBe(before.get("step"));
  expect(after.get("branch")).toBe(before.get("branch"));
  await expect(page.locator(".timeline-steps button").nth(2)).toHaveAttribute(
    "aria-current",
    "step",
  );
});

test("guide et entraînement disponibles hors ligne ; tuto accessible avec bibliothèque vide", async ({
  page,
  context,
}) => {
  await page.goto("");
  await ready(page);
  await page.getByText("Disponible hors ligne", { exact: true }).waitFor();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true },
        ),
      );
  });
  await context.setOffline(true);
  await page.getByRole("link", { name: "Tuto", exact: true }).click();
  await page.reload();
  await ready(page);
  await expect(
    page.getByRole("heading", { name: "Prendre en main CoachOS" }),
  ).toBeVisible();
  await page
    .getByText("Essayer les gestes sur un terrain d’entraînement", {
      exact: true,
    })
    .click();
  await expect(page.locator(".tutorial-practice svg")).toBeVisible();
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open("coachos", 1);
      r.onsuccess = () => resolve(r.result);
    });
    await new Promise<void>((resolve) => {
      const tx = db.transaction("library", "readwrite"),
        store = tx.objectStore("library");
      const r = store.get("current");
      r.onsuccess = () =>
        store.put(
          {
            ...r.result,
            revision: r.result.revision + 1,
            plays: [],
            ...(r.result.examplePlayIds ? { examplePlayIds: [] } : {}),
            collections: [],
          },
          "current",
        );
      tx.oncomplete = () => resolve();
    });
    db.close();
  });
  await page.reload();
  await ready(page);
  await expect(
    page.getByRole("heading", { name: "Prendre en main CoachOS" }),
  ).toBeVisible();
});

test("tuto lisible au clavier, accessible et navigation sans chevauchement de 320 à 1440 px", async ({
  page,
}) => {
  await page.goto("#/tutorial");
  await ready(page);
  await page
    .getByText("Essayer les gestes sur un terrain d’entraînement", {
      exact: true,
    })
    .click();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const boxes = await page.locator(".sidebar nav a").evaluateAll((nodes) =>
      nodes.map((n) => {
        const b = n.getBoundingClientRect();
        return { left: b.left, right: b.right, top: b.top, bottom: b.bottom };
      }),
    );
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++)
        expect(
          Math.min(boxes[i].right, boxes[j].right) -
            Math.max(boxes[i].left, boxes[j].left) >
            0.5 &&
            Math.min(boxes[i].bottom, boxes[j].bottom) -
              Math.max(boxes[i].top, boxes[j].top) >
              0.5,
        ).toBe(false);
  }
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    ),
  ).toEqual([]);
  await page
    .getByRole("button", { name: "Comprendre les étapes", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page.locator("section").filter({
      has: page.getByRole("heading", {
        name: "Construire une étape à la fois",
      }),
    }),
  ).toBeFocused();
});
