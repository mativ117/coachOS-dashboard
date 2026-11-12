import { expect, test, type Page } from "@playwright/test";
import * as cmd from "../src/editor/commands";
import type { Play } from "../src/model/types";
async function ready(page: Page) {
  await expect(
    page.getByText("Enregistré sur cet appareil", { exact: false }),
  ).toBeVisible();
}
function fixture() {
  let p = cmd.initialize(cmd.createPlay("Lecture test"));
  let id = p.commonSteps[0].id;
  p = cmd.setBall(p, id, { mode: "attached", carrierId: "1" }, true);
  p = cmd.addAction(
    p,
    id,
    "run",
    [
      [375, 440],
      [250, 330],
      [200, 180],
    ],
    "1",
    undefined,
    true,
  ).play;
  p = cmd.changeStep(p, id, (s) => {
    s.title = "Coupe animée";
    s.note = "Couper au cercle, ballon conservé par le porteur.";
    s.timing = { durationMs: 4000 };
  });
  const next = cmd.addStep(p, "common", id);
  p = next.play;
  p = cmd.addAction(
    p,
    next.stepId,
    "screen",
    [
      [100, 110],
      [200, 210],
    ],
    "4",
  ).play;
  p = cmd.changeStep(p, next.stepId, (s) => {
    s.title = "Écran suivant";
    s.timing = { durationMs: 4000 };
  });
  const branch = cmd.addBranch(p, "Lecture alternative", next.stepId);
  p = branch.play;
  p = cmd.addAction(
    p,
    branch.stepId,
    "run",
    [
      [491, 310],
      [600, 250],
    ],
    "3",
  ).play;
  return p;
}
async function load(page: Page, play: Play) {
  await page.goto("");
  await ready(page);
  await page.evaluate(async (p) => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open("coachos", 1);
      r.onsuccess = () => resolve(r.result);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("library", "readwrite");
      const store = tx.objectStore("library");
      const r = store.get("current");
      r.onsuccess = () =>
        store.put(
          {
            ...r.result,
            revision: r.result.revision + 1,
            plays: [...r.result.plays, p],
          },
          "current",
        );
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, play);
  await page.goto(`?fixture=${play.id}#/presentation?play=${play.id}`);
  await ready(page);
}
async function freeze(page: Page) {
  const now = new Date("2026-11-12T15:00:00Z");
  await page.clock.install({ time: now });
  await page.clock.pauseAt(new Date(now.getTime() + 1000));
}
const pawn = (page: Page, id = "1") =>
  page.locator(`[data-layer="players"] [data-player="${id}"]`);

test("lecture, pause/reprise, vitesse sans saut et arrêt en fin de séquence", async ({
  page,
}) => {
  await load(page, fixture());
  await freeze(page);
  await page.getByRole("button", { name: "Lire", exact: true }).click();
  await page.clock.runFor(500);
  await expect(page.locator(".playback-court")).toHaveAttribute(
    "data-playback-mode",
    "animated",
  );
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const paused = await pawn(page).getAttribute("transform");
  const elapsed = Number(
    await page.locator(".playback-court").getAttribute("data-progress"),
  );
  const expected = await page
    .locator('[data-layer="paths"] > g path')
    .first()
    .evaluate((path, fraction) => {
      const p = (path as SVGPathElement).getPointAtLength(
        (path as SVGPathElement).getTotalLength() * fraction,
      );
      return [p.x, p.y];
    }, elapsed / 4000);
  const actual = paused!.match(/[-\d.]+/g)!.map(Number);
  expect(
    Math.hypot(actual[0] - expected[0], actual[1] - expected[1]),
  ).toBeLessThan(0.5);

  await page.clock.runFor(1200);
  expect(await pawn(page).getAttribute("transform")).toBe(paused);
  await page.getByRole("button", { name: "Lire", exact: true }).click();
  const before = await pawn(page).getAttribute("transform");
  await page
    .getByRole("combobox", { name: "Vitesse de lecture" })
    .selectOption("2");
  expect(await pawn(page).getAttribute("transform")).toBe(before);
  await page.clock.runFor(400);
  expect(await pawn(page).getAttribute("transform")).not.toBe(before);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.getByRole("button", { name: "Suivante →", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Écran suivant", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Lire", exact: true }).click();
  await page.clock.runFor(7000);
  await expect(
    page.getByRole("button", { name: "Lire", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Choisir l’étape" }),
  ).toHaveValue("2");
  await expect(pawn(page, "3")).toHaveAttribute(
    "transform",
    "translate(600 250)",
  );
});

test("scrub et changement de lecture : pause, tronc commun conservé, aucun outil d’édition", async ({
  page,
}) => {
  await load(page, fixture());
  await freeze(page);
  const range = page.getByRole("slider", { name: "Progression de l’étape" });
  await range.press("End");
  await range.press("ArrowLeft");
  const position = await pawn(page).getAttribute("transform");
  await page.clock.runFor(500);
  expect(await pawn(page).getAttribute("transform")).toBe(position);
  await page
    .getByRole("combobox", { name: "Choisir la lecture" })
    .selectOption("common");
  await expect(
    page.getByRole("combobox", { name: "Choisir l’étape" }).locator("option"),
  ).toHaveCount(2);
  await expect(
    page.getByRole("heading", { name: "Coupe animée", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("toolbar", { name: "Outils de dessin" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("textbox", { name: "Notes de l’étape" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Recommencer", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Choisir l’étape" }),
  ).toHaveValue("0");
});

test("ballon d’une passe confirmée en vol puis attaché au destinataire", async ({
  page,
}) => {
  let p = cmd.initialize(cmd.createPlay("Passe animée"));
  const id = p.commonSteps[0].id;
  p = cmd.setBall(p, id, { mode: "attached", carrierId: "1" }, true);
  const pass = cmd.addAction(
    p,
    id,
    "pass",
    [
      [375, 440],
      [650, 110],
    ],
    "1",
    "2",
  );
  p = cmd.confirmPass(pass.play, id, pass.actionId, true);
  p = cmd.changeStep(p, id, (s) => {
    s.timing = { durationMs: 4000 };
  });
  await load(page, p);
  await freeze(page);
  await page.getByRole("button", { name: "Lire", exact: true }).click();
  await page.clock.runFor(1000);
  const cx = Number(
    await page.locator('[data-layer="ball"] circle').getAttribute("cx"),
  );
  expect(cx).toBeGreaterThan(397);
  expect(cx).toBeLessThan(672);
  await page.clock.runFor(4000);
  await expect(page.locator('[data-layer="ball"] circle')).toHaveAttribute(
    "cx",
    "672",
  );
  await expect(page.locator('[data-layer="ball"] circle')).toHaveAttribute(
    "cy",
    "124",
  );
});

test("Stack et préférence de mouvements réduits : positions statiques correctes et navigation possible", async ({
  page,
}) => {
  await page.goto("#/presentation?play=stack");
  await ready(page);
  await freeze(page);
  await page.getByRole("button", { name: "Lire", exact: true }).click();
  await page.clock.runFor(400);
  await expect(page.locator(".playback-court")).toHaveAttribute(
    "data-playback-mode",
    "static-review",
  );
  await expect(pawn(page)).toHaveAttribute("transform", "translate(179 287)");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(
    page.getByRole("button", { name: "Lire", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Suivante →", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Étape 2", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".playback-court")).toHaveAttribute(
    "data-playback-mode",
    "motion-reduced",
  );
});

test("mode agrandi de repli, focus, Échap et absence de chevauchement portrait/paysage", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(document, "fullscreenEnabled", {
      get: () => false,
      configurable: true,
    }),
  );
  await load(page, fixture());
  await page.getByRole("button", { name: "Plein écran", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Lecture de Lecture test" }),
  ).toBeVisible();
  for (const [width, height] of [
    [390, 844],
    [844, 390],
    [1440, 1000],
  ]) {
    await page.setViewportSize({ width, height });
    const overlaps = await page
      .locator(".animation-player")
      .evaluate((root) => {
        const controls = Array.from(
          root.querySelectorAll("button, select, input, summary"),
        ).filter((n) => n.getClientRects().length);
        const issues: string[] = [];
        for (let i = 0; i < controls.length; i++)
          for (let j = i + 1; j < controls.length; j++) {
            if (
              controls[i].contains(controls[j]) ||
              controls[j].contains(controls[i])
            )
              continue;
            const a = controls[i].getBoundingClientRect(),
              b = controls[j].getBoundingClientRect();
            if (
              Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 &&
              Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5
            )
              issues.push(
                `${controls[i].textContent}/${controls[j].textContent}`,
              );
          }
        return issues;
      });
    expect(overlaps).toEqual([]);
  }
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Plein écran", exact: true }),
  ).toBeFocused();
});

test("timing enregistré et aperçu animé depuis l’éditeur", async ({ page }) => {
  const p = fixture();
  await load(page, p);
  await page
    .getByRole("link", { name: "Retour à l’éditeur", exact: true })
    .click();
  await page
    .locator(".editor-panel summary")
    .filter({ hasText: /^Animation/ })
    .click();
  await page
    .getByRole("spinbutton", { name: "Durée de l’étape (secondes)" })
    .fill("2.5");
  await ready(page);
  await page.getByRole("button", { name: "Aperçu animé", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Lire", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("toolbar", { name: "Outils de dessin" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Revenir à l’édition", exact: true })
    .click();
  await page.reload();
  await ready(page);
  await page
    .locator(".editor-panel summary")
    .filter({ hasText: /^Animation/ })
    .click();
  await expect(
    page.getByRole("spinbutton", { name: "Durée de l’étape (secondes)" }),
  ).toHaveValue("2.5");
});

test("plein écran natif si disponible, sinon agrandissement accessible", async ({
  page,
}) => {
  await load(page, fixture());
  await page.getByRole("button", { name: "Plein écran", exact: true }).click();
  await expect(page.locator(".animation-player")).toHaveClass(
    /player-expanded/,
  );
  expect(
    await page.evaluate(
      () =>
        !!document.fullscreenElement ||
        !!document.querySelector(".player-fallback"),
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Quitter le plein écran", exact: true })
    .click();
  await expect(page.locator(".animation-player")).not.toHaveClass(
    /player-expanded/,
  );
});
