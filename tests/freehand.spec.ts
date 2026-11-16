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
    .fill("Dessin libre");
  await page
    .getByRole("button", { name: "Créer le système", exact: true })
    .click();
  await page.getByRole("button", { name: "+ Étape", exact: true }).click();
  await ready(page);
}
async function read(page: Page) {
  return page.evaluate(async () => {
    const id = new URLSearchParams(location.hash.split("?")[1]).get("play");
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open("coachos", 1);
      r.onsuccess = () => resolve(r.result);
    });
    const lib = await new Promise<{
      plays: import("../src/model/types").Play[];
    }>((resolve) => {
      const tx = db.transaction("library");
      const r = tx.objectStore("library").get("current");
      tx.oncomplete = () => resolve(r.result);
    });
    db.close();
    return lib.plays.find((p) => p.id === id)!;
  });
}
async function gesture(
  page: Page,
  points: number[][],
  touch: boolean,
  cancel = false,
) {
  const svg = page.locator(".editor-surface > svg");
  await svg.scrollIntoViewIfNeeded();
  const xy = await svg.evaluate(
    (el, pts) =>
      pts.map(([x, y]) => {
        const p = new DOMPoint(x, y).matrixTransform(
          (el as SVGSVGElement).getScreenCTM()!,
        );
        return { x: p.x, y: p.y };
      }),
    points,
  );
  if (touch) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ ...xy[0], id: 1 }],
    });
    for (const p of xy.slice(1))
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ ...p, id: 1 }],
      });
    await cdp.send("Input.dispatchTouchEvent", {
      type: cancel ? "touchCancel" : "touchEnd",
      touchPoints: [],
    });
    await cdp.detach();
  } else {
    await page.mouse.move(xy[0].x, xy[0].y);
    await page.mouse.down();
    for (const p of xy.slice(1)) await page.mouse.move(p.x, p.y, { steps: 2 });
    if (cancel) await page.keyboard.press("Escape");
    await page.mouse.up();
  }
}

test("un zigzag tracé en un geste devient propre, conserve son trajet et se recharge", async ({
  page,
}, info) => {
  await create(page);
  await page.getByRole("button", { name: "Tracer", exact: true }).click();
  const anchors = [
      [375, 440],
      [270, 350],
      [410, 270],
      [260, 180],
      [380, 100],
    ],
    points: number[][] = [];
  for (let j = 1; j < anchors.length; j++)
    for (let n = 0; n < 15; n++) {
      const t = n / 15;
      points.push([
        anchors[j - 1][0] + (anchors[j][0] - anchors[j - 1][0]) * t,
        anchors[j - 1][1] +
          (anchors[j][1] - anchors[j - 1][1]) * t +
          Math.sin(n) * 0.5,
      ]);
    }
  points.push(anchors.at(-1)!);
  await gesture(page, points, info.project.name === "mobile");
  await ready(page);
  let p = await read(page);
  const action = p.commonSteps[1].actions[0];
  expect(p.commonSteps[1].actions).toHaveLength(1);
  expect(action.actorId).toBe("1");
  expect(action.geometry.kind).toBe("polyline");
  expect(action.geometry.points[0]).toEqual([375, 440]);
  expect(action.geometry.points.at(-1)).toEqual([380, 100]);
  expect(action.geometry.points.length).toBeLessThan(points.length / 2);
  expect(Math.min(...action.geometry.points.map((p) => p[0]))).toBeLessThan(
    280,
  );
  expect(Math.max(...action.geometry.points.map((p) => p[0]))).toBeGreaterThan(
    400,
  );
  expect(p.commonSteps[1].afterState.players["1"]).toEqual([380, 100]);
  await page.getByRole("button", { name: "↶ Annuler", exact: true }).click();
  await ready(page);
  expect((await read(page)).commonSteps[1].actions).toHaveLength(0);
  await page.getByRole("button", { name: "↷ Rétablir", exact: true }).click();
  await ready(page);
  await page.reload();
  await ready(page);
  p = await read(page);
  expect(p.commonSteps[1].actions[0]).toEqual(action);
  await expect(page.locator("[data-layer=paths] path")).toHaveAttribute(
    "d",
    /L/,
  );
});
test("trait droit redressé ; geste interrompu sans écriture ni mouvement fantôme", async ({
  page,
}, info) => {
  await create(page);
  await page.getByRole("button", { name: "Tracer", exact: true }).click();
  const points = Array.from({ length: 45 }, (_, i) => [
    650 - i * 3,
    110 + i * 5 + Math.sin(i) * 0.4,
  ]);
  await gesture(page, points, info.project.name === "mobile");
  await ready(page);
  let p = await read(page);
  expect(p.commonSteps[1].actions[0].geometry.kind).toBe("line");
  expect(p.commonSteps[1].actions[0].geometry.points).toHaveLength(2);
  const before = structuredClone(p);
  await page.getByRole("button", { name: "Tracer", exact: true }).click();
  await gesture(
    page,
    [
      [375, 440],
      [350, 390],
      [320, 340],
    ],
    info.project.name === "mobile",
    true,
  );
  await ready(page);
  p = await read(page);
  expect(p).toEqual(before);
  await expect(page.locator("[data-live-ink]")).toHaveCount(0);
});
test("écran de travail : terrain directement visible, étapes avant le board et réglages secondaires fermés", async ({
  page,
}) => {
  await create(page);
  await expect(
    page.getByRole("combobox", { name: "Forme du trajet" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("combobox", { name: "Format du play" }),
  ).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Lire l’étape", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Présenter", exact: true }),
  ).toHaveCount(0);
  const timeline = (await page.locator(".editor-timeline").boundingBox())!,
    board = (await page.locator(".editor-surface").boundingBox())!;
  expect(timeline.y).toBeLessThan(board.y);
  expect(board.y).toBeLessThan(450);
  await expect(
    page.getByRole("toolbar", { name: "Outils de dessin" }).getByRole("button"),
  ).toHaveCount(3);
  await expect(
    page.getByRole("button", { name: "Écran", exact: true }),
  ).not.toBeVisible();
});
