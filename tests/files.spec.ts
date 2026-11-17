import { expect, test, type Page, type Download } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { playFile, backupFile, parseFile } from "../src/files/formats";
import { migrateSources } from "../src/migration/migrate";
import { readFileSync } from "node:fs";
import * as cmd from "../src/editor/commands";
const make = () =>
  migrateSources(
    readFileSync("sources/index_original.html", "utf8"),
    readFileSync("sources/stack_user_v2.json", "utf8"),
  );
async function ready(page: Page) {
  await expect(
    page.getByText("Enregistré sur cet appareil", { exact: false }),
  ).toBeVisible();
}
async function upload(page: Page, text: string, name = "test.coachos") {
  await page
    .getByLabel("Fichier CoachOS à importer", { exact: true })
    .setInputFiles({
      name,
      mimeType: "application/json",
      buffer: Buffer.from(text),
    });
}
async function content(download: Download) {
  return readFile((await download.path())!);
}
async function db(page: Page) {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open("coachos", 1);
      r.onsuccess = () => resolve(r.result);
    });
    const result = await new Promise<import("../src/model/types").Library>(
      (resolve) => {
        const tx = database.transaction("library");
        const r = tx.objectStore("library").get("current");
        tx.oncomplete = () => resolve(r.result);
      },
    );
    database.close();
    return result;
  });
}
async function menu(page: Page, name: string) {
  const card = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name, exact: true }) });
  await card.locator("summary").click();
  return card;
}

test("export .coachos puis réimport identique ; conflit annulé, remplacé et conservé en copie", async ({
  page,
}) => {
  await page.goto("");
  await ready(page);
  const card = await menu(page, "Princeton");
  let pending = page.waitForEvent("download");
  await card
    .getByRole("button", { name: "Exporter .coachos", exact: true })
    .click();
  const original = await content(await pending);
  expect(parseFile(original.toString()).kind).toBe("play");
  await upload(page, original.toString());
  await expect(page.getByRole("dialog")).toContainText("Déjà identique");
  await expect(
    page.getByRole("button", { name: "Confirmer l’importation", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  const before = await db(page);
  const changed = {
    ...make().plays[0],
    name: "Princeton variante",
    revision: 4,
  };
  await upload(page, playFile(changed));
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  expect(await db(page)).toEqual(before);
  await upload(page, playFile(changed));
  await page
    .getByRole("combobox", { name: "Décision pour Princeton variante" })
    .selectOption("replace");
  await page
    .getByRole("button", { name: "Confirmer l’importation", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await ready(page);
  await expect(
    page.getByRole("heading", { name: "Princeton variante", exact: true }),
  ).toBeVisible();
  expect((await db(page)).plays).toHaveLength(8);
  await upload(page, original.toString());
  await page
    .getByRole("combobox", { name: "Décision pour Princeton", exact: true })
    .selectOption("copy");
  await page
    .getByRole("button", { name: "Confirmer l’importation", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await ready(page);
  expect((await db(page)).plays).toHaveLength(9);
  await page.reload();
  await ready(page);
  await expect(page.getByRole("article")).toHaveCount(9);
});

test("sauvegarde complète, aperçu de restauration et récupération de l’état précédent", async ({
  page,
}) => {
  await page.goto("");
  await ready(page);
  await page
    .locator(".library-settings-grid summary")
    .filter({ hasText: "Profil et préférences" })
    .click();
  await page
    .getByRole("textbox", { name: "Nom du coach", exact: true })
    .fill("Coach OWLS");
  await page
    .getByRole("textbox", { name: "Équipe", exact: true })
    .fill("OWLS U18");
  await page
    .getByRole("combobox", { name: "Orientation PDF", exact: true })
    .selectOption("landscape");
  const logo = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 4;
    c.height = 4;
    const x = c.getContext("2d")!;
    x.fillStyle = "#145bc0";
    x.fillRect(0, 0, 4, 4);
    return c.toDataURL("image/png").split(",")[1];
  });
  await page.getByLabel("Logo de l’équipe", { exact: true }).setInputFiles({
    name: "logo.png",
    mimeType: "image/png",
    buffer: Buffer.from(logo, "base64"),
  });
  await expect(
    page.getByRole("img", { name: "Logo de l’équipe", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Enregistrer les paramètres", exact: true })
    .click();
  await ready(page);
  const pending = page.waitForEvent("download");
  await page.getByText("Importer et sauvegarder", { exact: true }).click();
  await page
    .getByRole("button", { name: "Sauvegarder la bibliothèque", exact: true })
    .click();
  const bytes = await content(await pending);
  const backup = parseFile(bytes.toString());
  expect(backup.kind).toBe("backup");
  if (backup.kind !== "backup") return;
  expect(backup.library.profile?.team).toBe("OWLS U18");
  const reduced = structuredClone(backup.library);
  reduced.plays = reduced.plays.slice(0, 1);
  if (reduced.examplePlayIds)
    reduced.examplePlayIds = reduced.examplePlayIds.filter((id) =>
      reduced.plays.some((p) => p.id === id),
    );
  reduced.collections = [
    {
      id: "only",
      name: "Une seule collection",
      playIds: [reduced.plays[0].id],
    },
  ];
  reduced.profile = { coachName: "Restauré", team: "Autre équipe" };
  await upload(page, backupFile(reduced), "test.coachos-backup");
  await page
    .getByRole("combobox", { name: "Mode d’importation" })
    .selectOption("restore");
  await expect(page.getByRole("dialog")).toContainText(
    "8 systèmes actuels → 1",
  );
  await expect(
    page.getByRole("button", { name: "Restaurer cette sauvegarde" }),
  ).toBeDisabled();
  await page.getByRole("checkbox", { name: /J’ai vérifié l’aperçu/ }).check();
  await page
    .getByRole("button", { name: "Restaurer cette sauvegarde" })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await ready(page);
  await expect(page.getByRole("article")).toHaveCount(1);
  expect((await db(page)).profile?.coachName).toBe("Restauré");
  await page
    .getByRole("button", { name: "Exporter en PDF ou image", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Récupérer l’état précédent", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "1 systèmes actuels → 8",
  );
  await page.getByRole("checkbox", { name: /J’ai vérifié l’aperçu/ }).check();
  await page
    .getByRole("button", { name: "Restaurer cette sauvegarde" })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await ready(page);
  await expect(page.getByRole("article")).toHaveCount(8);
  expect((await db(page)).profile?.team).toBe("OWLS U18");
});

test("import malformé et quota : aucune mutation ; copie/collections sans duplication de données", async ({
  page,
}) => {
  await page.goto("");
  await ready(page);
  const before = await db(page);
  await upload(page, '{"__proto__":{"polluted":true}}');
  await expect(page.getByRole("alert")).toBeVisible();
  expect(await db(page)).toEqual(before);
  await upload(page, "x".repeat(4_000_001));
  await expect(page.getByRole("alert")).toContainText("volumineux");
  expect(await db(page)).toEqual(before);
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    (window as unknown as { restorePut: () => void }).restorePut = () => {
      IDBObjectStore.prototype.put = put;
    };
    IDBObjectStore.prototype.put = function () {
      throw new DOMException("Quota plein", "QuotaExceededError");
    };
  });
  await upload(
    page,
    playFile({ ...make().plays[0], name: "Version test", revision: 9 }),
  );
  await page
    .getByRole("combobox", { name: "Décision pour Version test" })
    .selectOption("replace");
  await page
    .getByRole("button", { name: "Confirmer l’importation", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Quota plein");
  expect(await db(page)).toEqual(before);
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  await page.evaluate(() =>
    (window as unknown as { restorePut: () => void }).restorePut(),
  );
  const card = await menu(page, "Pin Down Iso");
  await card
    .getByRole("button", { name: "Copier dans mes plays", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Tous les plays (9)", exact: true })
    .click();
  await ready(page);
  await expect(page.getByRole("article")).toHaveCount(9);
  const library = await db(page);
  const copied = library.plays.find((p) => p.name === "Pin Down Iso (copie)")!;
  expect(copied.branches).toHaveLength(4);
  expect(library.collections[0].playIds).toContain(copied.id);
});

test("PNG réel avec écran T et PDF multi-plays complet avec branches et consignes courtes", async ({
  page,
}) => {
  test.setTimeout(90000);
  let p = cmd.initialize(cmd.createPlay("Export courbe et écran"));
  const id = p.commonSteps[0].id;
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
  p = cmd.addAction(
    p,
    id,
    "screen",
    [
      [100, 110],
      [160, 220],
      [240, 260],
    ],
    "4",
    undefined,
    true,
  ).play;
  p = cmd.addAction(
    p,
    id,
    "annotation",
    [[250, 500]],
    undefined,
    undefined,
    false,
    "Lecture : écran → coupe",
  ).play;
  p = cmd.changeStep(p, id, (s) => {
    s.note =
      "Consigne complète à conserver, avec accents et flèches →. ".repeat(130);
  });
  await page.goto("");
  await ready(page);
  await upload(page, playFile(p));
  await page
    .getByRole("button", { name: "Confirmer l’importation", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await ready(page);
  await page
    .getByRole("button", { name: "Exporter en PDF ou image", exact: true })
    .click();
  await page.getByText("Une seule étape (PNG)", { exact: true }).click();
  await page
    .getByRole("combobox", { name: "Système à exporter en PNG" })
    .selectOption(p.id);
  let pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exporter le PNG", exact: true })
    .click();
  const png = await content(await pending);
  expect(png.subarray(1, 4).toString()).toBe("PNG");
  expect(png.readUInt32BE(16)).toBeGreaterThanOrEqual(1500);
  const pixels = await page.evaluate(async (data) => {
    const img = new Image();
    img.src = "data:image/png;base64," + data;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const x = c.getContext("2d")!;
    x.drawImage(img, 0, 0);
    const rgba = x.getImageData(0, 0, c.width, c.height).data;
    let blue = 0,
      amber = 0;
    for (let i = 0; i < rgba.length; i += 4) {
      if (rgba[i + 2] > rgba[i] + 50 && rgba[i + 2] > rgba[i + 1] + 20) blue++;
      if (
        rgba[i] > 130 &&
        rgba[i + 1] > 60 &&
        rgba[i + 1] < 180 &&
        rgba[i + 2] < 100
      )
        amber++;
    }
    return { blue, amber };
  }, png.toString("base64"));
  expect(pixels.blue).toBeGreaterThan(500);
  expect(pixels.amber).toBeGreaterThan(10);
  await page
    .getByRole("checkbox", { name: `Sélectionner ${p.name}`, exact: true })
    .check();
  await page
    .getByRole("checkbox", { name: "Sélectionner Pin Down Iso", exact: true })
    .check();
  pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "PDF de la sélection", exact: true })
    .click();
  const pdf = await content(await pending);
  const document = await PDFDocument.load(pdf);
  const iso = make().plays.find((play) => play.name === "Pin Down Iso")!;
  expect(document.getPageCount()).toBe(
    1 +
      iso.commonSteps.length +
      iso.branches.reduce((n, b) => n + b.steps.length, 0),
  );
  expect(document.getPage(0).getWidth()).toBeLessThan(
    document.getPage(0).getHeight(),
  );
});

test("partage natif déclenché seulement au clic, sinon téléchargement de repli", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "canShare", {
      value: () => true,
      configurable: true,
    });
    Object.defineProperty(navigator, "share", {
      value: async (data: ShareData) => {
        (window as unknown as { sharedName: string }).sharedName =
          data.files![0].name;
      },
      configurable: true,
    });
  });
  await page.goto("");
  await ready(page);
  const card = await menu(page, "Princeton");
  const pending = page.waitForEvent("download");
  await card
    .getByRole("button", { name: "Exporter .coachos", exact: true })
    .click();
  await pending;
  expect(await page.evaluate(() => Object.hasOwn(window, "sharedName"))).toBe(
    false,
  );
  await page
    .getByRole("button", { name: "Partager le fichier", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => (window as unknown as { sharedName: string }).sharedName,
    ),
  ).toBe("Princeton.coachos");
  await page.evaluate(() =>
    Object.defineProperty(navigator, "canShare", {
      value: () => false,
      configurable: true,
    }),
  );
  const fallback = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Partager le fichier", exact: true })
    .click();
  expect((await fallback).suggestedFilename()).toBe("Princeton.coachos");
});

test("panneaux fichiers et réglages compacts sans chevauchement à 320–1440 px", async ({
  page,
}) => {
  await page.goto("");
  await ready(page);
  await page
    .getByRole("button", { name: "Exporter en PDF ou image", exact: true })
    .click();
  await page
    .locator(".library-workspace details")
    .evaluateAll((nodes) =>
      nodes.forEach((n) => ((n as HTMLDetailsElement).open = true)),
    );
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const overlaps = await page
      .locator(".library-workspace")
      .evaluate((root) => {
        const elements = Array.from(
          root.querySelectorAll(
            "button,select,input:not([type=hidden]),summary",
          ),
        ).filter((n) => n.getClientRects().length);
        const result: string[] = [];
        for (let i = 0; i < elements.length; i++)
          for (let j = i + 1; j < elements.length; j++) {
            if (
              elements[i].contains(elements[j]) ||
              elements[j].contains(elements[i])
            )
              continue;
            const a = elements[i].getBoundingClientRect(),
              b = elements[j].getBoundingClientRect();
            if (
              Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 &&
              Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5
            )
              result.push(
                `${elements[i].textContent}/${elements[j].textContent}`,
              );
          }
        return result;
      });
    expect(overlaps, `largeur ${width}`).toEqual([]);
  }
});
