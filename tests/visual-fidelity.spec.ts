import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const source = readFileSync("sources/index_original.html", "utf8");
const snapshot = JSON.parse(readFileSync("docs/source-snapshot.json", "utf8"));

test("rendu statique : positions, courbes, marqueurs écran et ballon identiques aux sources historiques", async ({
  page,
  context,
}) => {
  test.setTimeout(90000);
  await context.route("**/reference-original", (route) =>
    route.fulfill({ contentType: "text/html", body: source }),
  );
  const original = await context.newPage();
  await original.emulateMedia({ reducedMotion: "reduce" });
  await original.goto("http://127.0.0.1:4174/reference-original");
  for (let pi = 0; pi < 5; pi++) {
    const old = snapshot.historical[pi];
    const id = [
      "princeton",
      "pin-down-iso",
      "pin-down-cut",
      "stagger-elevator",
      "slob",
    ][pi];
    const routes = old.variants ? Object.keys(old.variants) : [undefined];
    for (const branch of routes) {
      await original.locator("#tabs button").nth(pi).click();
      if (branch)
        await original
          .locator("#choices button")
          .filter({ hasText: old.variants[branch].label })
          .click();
      await page.goto(`#/editor?play=${id}`);
      await expect(
        page.getByText("Enregistré sur cet appareil", { exact: false }),
      ).toBeVisible();
      if (branch)
        await page
          .getByRole("combobox", { name: "Choisir la lecture" })
          .selectOption(`${id}:branch:${branch}`);
      const count =
        old.steps?.length ??
        old.base.length + old.variants[branch!].steps.length;
      for (let i = 0; i < count; i++) {
        if (i > 0) await original.locator("#next").click();
        await page
          .getByRole("combobox", { name: "Choisir l’étape" })
          .selectOption(String(i));
        const expected = await original.evaluate(() => ({
          paths: Array.from(document.querySelectorAll("#paths path"), (p) =>
            p.getAttribute("d"),
          ),
          screens: Array.from(document.querySelectorAll("#screens path"), (p) =>
            p.getAttribute("d"),
          ),
          players: Array.from(document.querySelectorAll("#players > g"), (p) =>
            p.getAttribute("transform"),
          ),
          ball: ["cx", "cy"].map((attr) =>
            document.querySelector("#ball circle")?.getAttribute(attr),
          ),
        }));
        const actual = await page.evaluate(() => ({
          paths: Array.from(
            document.querySelectorAll('[data-layer="paths"] path'),
            (p) => p.getAttribute("d"),
          ),
          screens: Array.from(
            document.querySelectorAll('[data-layer="screens"] path'),
            (p) => p.getAttribute("d"),
          ),
          players: Array.from(
            document.querySelectorAll('[data-layer="players"] > g'),
            (p) => p.getAttribute("transform"),
          ),
          ball: ["cx", "cy"].map((attr) =>
            document
              .querySelector('[data-layer="ball"] circle')
              ?.getAttribute(attr),
          ),
        }));
        expect(actual, `${old.name}/${branch ?? "linéaire"}/${i + 1}`).toEqual(
          expected,
        );
      }
    }
  }
  await original.close();
});
