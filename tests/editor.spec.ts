import { expect, test, type Page } from "@playwright/test";
async function ready(page: Page) {
  await expect(
    page.getByText("Enregistré sur cet appareil", { exact: false }),
  ).toBeVisible();
}
async function create(page: Page, name: string) {
  await page.goto("");
  await ready(page);
  await page
    .getByRole("button", { name: "+ Nouveau système", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Nom du nouveau système" })
    .fill(name);
  await page
    .getByRole("button", { name: "Créer le système", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Initialiser 5 joueurs", exact: true })
    .click();
  await ready(page);
}
async function point(page: Page, x: number, y: number, touch = false) {
  const svg = page.locator(".editor-surface > svg");
  await svg.scrollIntoViewIfNeeded();
  const p = await svg.evaluate(
    (el, xy) => {
      const m = (el as SVGSVGElement).getScreenCTM()!;
      const p = new DOMPoint(xy[0], xy[1]).matrixTransform(m);
      return { x: p.x, y: p.y };
    },
    [x, y],
  );
  if (touch) await page.touchscreen.tap(p.x, p.y);
  else await page.mouse.click(p.x, p.y);
}
async function readPlay(page: Page) {
  return page.evaluate(async () => {
    const id = new URLSearchParams(location.hash.split("?")[1]).get("play");
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open("coachos", 1);
      r.onsuccess = () => resolve(r.result);
    });
    const library = await new Promise<{ plays: unknown[] }>((resolve) => {
      const tx = db.transaction("library");
      const r = tx.objectStore("library").get("current");
      tx.oncomplete = () => resolve(r.result);
    });
    db.close();
    return library.plays.find(
      (p) => (p as { id: string }).id === id,
    ) as import("../src/model/types").Play;
  });
}

test("courbe réglable, notes, undo/redo et rechargement fidèle", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await create(page, "Courbe complète");
  await page.getByRole("button", { name: "Courbe", exact: true }).click();
  const touch = info.project.name === "mobile";
  await point(page, 375, 440, touch);
  await point(page, 300, 300, touch);
  await point(page, 200, 180, touch);
  await expect(page.locator('[data-layer="paths"] > g')).toHaveCount(1);
  await page
    .getByRole("spinbutton", { name: "Position X", exact: true })
    .fill("250");
  await page
    .getByRole("spinbutton", { name: "Position Y", exact: true })
    .fill("280");
  await page.getByRole("button", { name: "Appliquer la position" }).click();
  await page
    .locator(".editor-panel summary")
    .filter({ hasText: /^Notes/ })
    .click();
  await page
    .getByRole("textbox", { name: "Notes de l’étape" })
    .fill("Passe puis coupe : garder le timing.");
  await page.getByRole("button", { name: "↶ Annuler", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Notes de l’étape" }),
  ).toHaveValue("");
  await page.getByRole("button", { name: "↷ Rétablir", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Notes de l’étape" }),
  ).toHaveValue("Passe puis coupe : garder le timing.");
  await ready(page);
  const stored = await readPlay(page);
  expect(stored.commonSteps[0].actions[0].geometry.points[1]).toEqual([
    250, 280,
  ]);
  await page.reload();
  await ready(page);
  await page
    .locator(".editor-panel summary")
    .filter({ hasText: /^Notes/ })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Notes de l’étape" }),
  ).toHaveValue("Passe puis coupe : garder le timing.");
  expect((await readPlay(page)).commonSteps[0].actions).toEqual(
    stored.commonSteps[0].actions,
  );
  expect(errors).toEqual([]);
});

test("passe optionnelle/validée, écran courbe en T et ballon libre", async ({
  page,
}) => {
  await create(page, "Passe et écran");
  await page
    .locator(".editor-panel summary")
    .filter({ hasText: /^Ballon$/ })
    .click();
  await page
    .getByRole("combobox", { name: "Porteur au départ", exact: true })
    .selectOption("1");
  await page.getByRole("button", { name: "Passe", exact: true }).click();
  await point(page, 375, 440);
  await point(page, 650, 110);
  await ready(page);
  expect((await readPlay(page)).commonSteps[0].afterState.ball).toEqual({
    mode: "attached",
    carrierId: "1",
  });
  await page.getByRole("checkbox", { name: "Exécuter cette passe" }).check();
  await ready(page);
  expect((await readPlay(page)).commonSteps[0].afterState.ball).toEqual({
    mode: "attached",
    carrierId: "2",
  });
  await page.getByRole("button", { name: "Écran courbe", exact: true }).click();
  await point(page, 100, 110);
  await point(page, 160, 220);
  await point(page, 240, 260);
  await expect(
    page.locator('[data-layer="paths"] > g').nth(1).locator("path"),
  ).toHaveCount(2);
  await page.getByRole("button", { name: "+ Étape", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Porteur à l’arrivée", exact: true })
    .selectOption("free");
  await page.getByRole("button", { name: "Déplacer le ballon libre" }).click();
  await point(page, 500, 450);
  await ready(page);
  const p = await readPlay(page);
  expect(p.commonSteps[1].afterState.ball).toEqual({
    mode: "free",
    position: [500, 450],
  });
  expect(p.commonSteps[0].actions[1].geometry.kind).toBe("catmull-rom");
  await page.reload();
  await ready(page);
  await page
    .getByRole("combobox", { name: "Choisir l’étape" })
    .selectOption("1");
  await expect(page.locator('[data-layer="ball"] circle')).toHaveAttribute(
    "cx",
    "500",
  );
});

test("placement par appuis, défenseurs, lecture et terrain entier persistés", async ({
  page,
}, info) => {
  await create(page, "Lecture mobile");
  const touch = info.project.name === "mobile";
  await point(page, 375, 440, touch);
  await point(page, 330, 390, touch);
  await page
    .getByRole("button", { name: "Ajouter 5 défenseurs", exact: true })
    .click();
  await expect(page.locator('[data-layer="defenders"] > g')).toHaveCount(5);
  await page
    .locator(".editor-panel summary")
    .filter({ hasText: /^Lectures et système$/ })
    .click();
  await page
    .getByRole("textbox", { name: "Nom de la nouvelle lecture" })
    .fill("Lecture côté faible");
  await page
    .getByRole("button", { name: "Créer la lecture", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Format du play" })
    .selectOption("full");
  await ready(page);
  let p = await readPlay(page);
  expect(p.commonSteps[0].afterState.players["1"]).toEqual([330, 390]);
  expect(p.branches).toHaveLength(1);
  expect(p.court.kind).toBe("full");
  await page.reload();
  await ready(page);
  await expect(page.locator(".editor-surface > svg")).toHaveAttribute(
    "viewBox",
    "0 0 750 1215",
  );
  await expect(
    page.getByRole("combobox", { name: "Choisir la lecture" }),
  ).toContainText("Lecture côté faible");
  p = await readPlay(page);
  expect(p.branches[0].steps[0].beforeState.players["1"]).toEqual([330, 390]);
});

test("format compact sans chevauchement à 320, 390, 768 et 1440 pixels", async ({
  page,
}) => {
  await page.goto("#/editor?play=princeton");
  await ready(page);
  await page
    .locator(".editor-panel summary")
    .filter({ hasText: /^Sélection/ })
    .click();
  await page
    .getByRole("combobox", { name: "Élément sélectionné" })
    .selectOption("p:1");
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page
      .locator(".editor details")
      .evaluateAll((nodes) =>
        nodes.forEach((n) => ((n as HTMLDetailsElement).open = true)),
      );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `débordement à ${width}`,
    ).toBe(true);
    const overlaps = await page.evaluate(() => {
      const nodes = Array.from(
        document.querySelectorAll(
          ".editor button, .editor select, .editor input, .editor textarea, .editor summary",
        ),
      ).filter(
        (n) =>
          n.getClientRects().length &&
          getComputedStyle(n).visibility !== "hidden" &&
          !n.closest(".timeline-steps"),
      );
      const result: string[] = [];
      for (let i = 0; i < nodes.length; i++)
        for (let j = i + 1; j < nodes.length; j++) {
          if (nodes[i].contains(nodes[j]) || nodes[j].contains(nodes[i]))
            continue;
          const a = nodes[i].getBoundingClientRect(),
            b = nodes[j].getBoundingClientRect();
          if (
            Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 &&
            Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5
          )
            result.push(
              `${nodes[i].textContent?.slice(0, 25)}/${nodes[j].textContent?.slice(0, 25)}`,
            );
        }
      return result;
    });
    expect(overlaps, `chevauchement à ${width}`).toEqual([]);
  }
});

test("saisie rapide, glisser-déposer et annotation conservés sans exécution HTML", async ({
  page,
}) => {
  await create(page, "Gestes et saisie");
  await page
    .locator(".editor-panel summary")
    .filter({ hasText: /^Notes/ })
    .click();
  const note = "Passe rapide puis coupe côté faible.";
  await page
    .getByRole("textbox", { name: "Notes de l’étape" })
    .pressSequentially(note, { delay: 0 });
  await page.getByRole("button", { name: "Sélection", exact: true }).click();
  const svg = page.locator(".editor-surface > svg");
  await svg.scrollIntoViewIfNeeded();
  const coords = await svg.evaluate((el) => {
    const m = (el as SVGSVGElement).getScreenCTM()!;
    return [
      [375, 440],
      [290, 390],
    ].map(([x, y]) => {
      const p = new DOMPoint(x, y).matrixTransform(m);
      return { x: p.x, y: p.y };
    });
  });
  await page.mouse.move(coords[0].x, coords[0].y);
  await page.mouse.down();
  await page.mouse.move(coords[1].x, coords[1].y, { steps: 6 });
  await page.mouse.up();
  await page.getByRole("button", { name: "Annotation", exact: true }).click();
  const text = "<script>window.injected=true</script>";
  await page.getByRole("textbox", { name: "Annotation à placer" }).fill(text);
  await point(page, 200, 500);
  await ready(page);
  const p = await readPlay(page);
  expect(p.commonSteps[0].note).toBe(note);
  expect(p.commonSteps[0].afterState.players["1"]).toEqual([290, 390]);
  await expect(page.locator('[data-layer="annotations"] text')).toHaveText(
    text,
  );
  expect(await page.evaluate(() => Object.hasOwn(window, "injected"))).toBe(
    false,
  );
  await page.reload();
  await ready(page);
  expect((await readPlay(page)).commonSteps[0].note).toBe(note);
  await expect(page.locator('[data-layer="annotations"] text')).toHaveText(
    text,
  );
});

test("quota à l’autosave : brouillon exportable et reprise sans perte", async ({
  page,
}) => {
  await create(page, "Secours éditeur");
  await page
    .locator(".editor-panel summary")
    .filter({ hasText: /^Notes/ })
    .click();
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    (window as unknown as { restorePut: () => void }).restorePut = () => {
      IDBObjectStore.prototype.put = original;
    };
    IDBObjectStore.prototype.put = function () {
      throw new DOMException("Quota plein", "QuotaExceededError");
    };
  });
  await page
    .getByRole("textbox", { name: "Notes de l’étape" })
    .fill("Brouillon à conserver malgré le quota.");
  await expect(page.locator(".storage-error")).toContainText("Quota plein");
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: "Exporter les données affichées (JSON)",
      exact: true,
    })
    .click();
  const file = await download;
  const path = await file.path();
  const { readFile } = await import("node:fs/promises");
  expect(await readFile(path!, "utf8")).toContain(
    "Brouillon à conserver malgré le quota.",
  );
  await page.evaluate(() =>
    (window as unknown as { restorePut: () => void }).restorePut(),
  );
  await page
    .getByRole("button", { name: "Réessayer la sauvegarde", exact: true })
    .click();
  await ready(page);
  await page.reload();
  await ready(page);
  expect((await readPlay(page)).commonSteps[0].note).toBe(
    "Brouillon à conserver malgré le quota.",
  );
});
