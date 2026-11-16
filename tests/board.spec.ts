import { expect, test, type Page } from "@playwright/test";
async function ready(page: Page) {
  await expect(
    page.getByText("Enregistré sur cet appareil", { exact: false }),
  ).toBeVisible();
}
async function create(page: Page) {
  await page.goto("");
  await ready(page);
  await page
    .getByRole("button", { name: "+ Nouveau système", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Nom du nouveau système" })
    .fill("Board simple");
  await page
    .getByRole("button", { name: "Créer le système", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Initialiser 5 joueurs", exact: true })
    .click();
  await ready(page);
}
async function at(page: Page, x: number, y: number) {
  const svg = page.locator(".editor-surface > svg");
  await svg.scrollIntoViewIfNeeded();
  const q = await svg.evaluate(
    (s, xy) => {
      const p = new DOMPoint(...xy).matrixTransform(
        (s as SVGSVGElement).getScreenCTM()!,
      );
      return { x: p.x, y: p.y };
    },
    [x, y] as [number, number],
  );
  await page.mouse.click(q.x, q.y);
}
async function stored(page: Page) {
  return page.evaluate(async () => {
    const id = new URLSearchParams(location.hash.split("?")[1]).get("play");
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open("coachos", 1);
      r.onsuccess = () => resolve(r.result);
    });
    const library = await new Promise<{
      plays: import("../src/model/types").Play[];
    }>((resolve) => {
      const tx = db.transaction("library");
      const r = tx.objectStore("library").get("current");
      tx.oncomplete = () => resolve(r.result);
    });
    db.close();
    return library.plays.find((p) => p.id === id)!;
  });
}

test("un seul board pour placer joueurs/ballon, dessiner et hériter à l’étape suivante", async ({
  page,
}) => {
  await create(page);
  await expect(
    page.getByRole("spinbutton", { name: "Position X" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("combobox", { name: "Élément sélectionné" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("combobox", { name: "Choisir l’étape" }),
  ).toHaveCount(0);
  await expect(page.locator(".advanced-editor")).not.toHaveAttribute(
    "open",
    "",
  );
  await page
    .getByRole("button", { name: "Déplacer joueur 1", exact: true })
    .focus();
  await page.keyboard.press("ArrowLeft");
  await ready(page);
  await at(page, 392, 454);
  await at(page, 650, 110);
  await ready(page);
  let p = await stored(page);
  expect(p.initialState.players["1"]).toEqual([370, 440]);
  expect(p.initialState.ball).toEqual({ mode: "attached", carrierId: "2" });
  await page
    .getByRole("button", { name: "+ Étape suivante", exact: true })
    .click();
  await expect(
    page.getByRole("toolbar", { name: "Outils de dessin" }).getByRole("button"),
  ).toHaveCount(5);
  await at(page, 370, 440);
  await at(page, 330, 380);
  await ready(page);
  p = await stored(page);
  expect(p.commonSteps[1].actions).toEqual([]);
  expect(p.commonSteps[1].beforeState.players["1"]).toEqual([370, 440]);
  await page.getByRole("button", { name: "Course", exact: true }).click();
  await at(page, 330, 380);
  await at(page, 220, 200);
  await ready(page);
  p = await stored(page);
  expect(p.commonSteps[1].actions).toHaveLength(1);
  await page
    .getByRole("button", { name: "+ Étape suivante", exact: true })
    .click();
  await ready(page);
  p = await stored(page);
  expect(p.commonSteps[2].beforeState.players["1"]).toEqual([220, 200]);
  expect(p.commonSteps[2].actions).toEqual([]);
  await page.reload();
  await ready(page);
  await expect(
    page.locator(".timeline-steps [aria-current=step] span"),
  ).toHaveText("3");
});

test("deux paniers identiques, cadre complet lisible et garde-fou demi-terrain", async ({
  page,
}) => {
  await create(page);
  await page
    .getByRole("combobox", { name: "Format du play" })
    .selectOption("full");
  await ready(page);
  const ends = await page.locator("[data-court-end]").evaluateAll((nodes) =>
    nodes.map((n) =>
      Array.from(n.querySelectorAll("rect,path,circle")).map((el) => ({
        shape: el.outerHTML,
        stroke: getComputedStyle(el).stroke,
        width: getComputedStyle(el).strokeWidth,
        fill: getComputedStyle(el).fill,
      })),
    ),
  );
  expect(ends).toHaveLength(2);
  expect(ends[0]).toEqual(ends[1]);
  expect(
    await page
      .locator(".editor-surface > svg")
      .evaluate((s) => s.getBoundingClientRect().height),
  ).toBeGreaterThanOrEqual(400);
  await page
    .getByRole("button", { name: "Déplacer joueur 1", exact: true })
    .focus();
  for (let i = 0; i < 24; i++) await page.keyboard.press("Shift+ArrowDown");
  await ready(page);
  expect((await stored(page)).initialState.players["1"][1]).toBe(1040);
  const before = (await stored(page)).revision;
  page.once("dialog", (d) => d.dismiss());
  await page
    .getByRole("combobox", { name: "Format du play" })
    .selectOption("half");
  await ready(page);
  expect((await stored(page)).court.kind).toBe("full");
  expect((await stored(page)).revision).toBe(before);
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("combobox", { name: "Format du play" })
    .selectOption("half");
  await ready(page);
  await expect(page.getByText(/Des éléments sont hors du cadre/)).toBeVisible();
  await page
    .getByRole("button", {
      name: "Recadrer — voir tous les éléments",
      exact: true,
    })
    .click();
  const box = (await page
    .locator(".editor-surface > svg")
    .getAttribute("viewBox"))!
    .split(" ")
    .map(Number);
  expect(box[1] + box[3]).toBeGreaterThan(1040);
  expect((await stored(page)).initialState.players["1"][1]).toBe(1040);
});

test("zoom et déplacement du cadrage ne modifient pas les placements", async ({
  page,
}) => {
  await create(page);
  const original = await stored(page);
  await page
    .getByRole("button", { name: "Agrandir le terrain", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Agrandir le terrain", exact: true })
    .click();
  await expect(page.getByText("200 %", { exact: true })).toBeVisible();
  const svg = page.locator(".editor-surface > svg");
  await svg.scrollIntoViewIfNeeded();
  const before = await svg.getAttribute("viewBox");
  await page
    .getByRole("button", { name: "Déplacer la vue", exact: true })
    .click();
  await svg.scrollIntoViewIfNeeded();
  const box = (await svg.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 50,
    box.y + box.height / 2 + 30,
  );
  await page.mouse.up();
  expect(await svg.getAttribute("viewBox")).not.toBe(before);
  expect(await stored(page)).toEqual(original);
  await page.getByRole("button", { name: "Vue entière", exact: true }).click();
  await expect(svg).toHaveAttribute("viewBox", "0 0 750 655");
});
