import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";

async function ready(page: Page) {
  await expect(
    page.getByText("Enregistré sur cet appareil", { exact: false }),
  ).toBeVisible();
}
async function offlineReady(page: Page) {
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
  await expect(
    page.getByText("Disponible hors ligne", { exact: true }),
  ).toBeVisible();
}

test("PWA sous chemin du dépôt : édition, présentation, réouverture et exports sans réseau", async ({
  page,
  context,
}) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("");
  await ready(page);
  await offlineReady(page);
  const manifest = await page.evaluate(async () =>
    (
      await fetch(
        document.querySelector<HTMLLinkElement>("link[rel=manifest]")!.href,
      )
    ).json(),
  );
  expect(manifest.scope).toBe("./");
  expect(manifest.id).toBe("/coachOS-dashboard/");
  expect(manifest.icons).toHaveLength(2);
  const keys = await page.evaluate(async () => {
    const names = await caches.keys();
    const cache = await caches.open(
      names.find((name) => name.startsWith("coachos-"))!,
    );
    return (await cache.keys()).map((request) => request.url);
  });
  expect(keys.some((key) => /graphics-.*\.js$/.test(key))).toBe(true);
  expect(keys.some((key) => /\/es-.*\.js$/.test(key))).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await ready(page);
  await page
    .getByRole("link", { name: "Ouvrir Princeton", exact: true })
    .click();
  await page
    .locator(".editor-panel summary")
    .filter({ hasText: /^Notes/ })
    .click();
  await page
    .getByRole("textbox", { name: "Notes de l’étape" })
    .fill("Consigne enregistrée hors ligne.");
  await ready(page);
  await page.reload();
  await ready(page);
  await page
    .locator(".editor-panel summary")
    .filter({ hasText: /^Notes/ })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Notes de l’étape" }),
  ).toHaveValue("Consigne enregistrée hors ligne.");
  await page.getByRole("link", { name: "Présenter", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Princeton");
  await page.getByRole("button", { name: "Suivante →", exact: true }).click();
  await page.goto("#/library");
  await page
    .getByRole("button", { name: "Fichiers et exports", exact: true })
    .click();
  let pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exporter le PNG", exact: true })
    .click();
  expect((await pending).suggestedFilename()).toMatch(/\.png$/);
  await page
    .getByRole("checkbox", { name: "Sélectionner Princeton", exact: true })
    .check();
  pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "PDF de la sélection", exact: true })
    .click();
  expect((await pending).suggestedFilename()).toMatch(/\.pdf$/);
  pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Sauvegarder la bibliothèque", exact: true })
    .click();
  expect((await pending).suggestedFilename()).toMatch(/\.coachos-backup$/);
  expect(errors).toEqual([]);
});

test("CSP refuse script importé, ressources externes et objets actifs ; clavier disponible", async ({
  page,
}) => {
  await page.goto("");
  await ready(page);
  const result = await page.evaluate(async () => {
    const violations: string[] = [];
    document.addEventListener("securitypolicyviolation", (event) =>
      violations.push(event.violatedDirective),
    );
    const script = document.createElement("script");
    script.textContent = "window.hostileExecuted = true";
    document.body.append(script);
    let blocked = false;
    try {
      await fetch("https://example.org/private");
    } catch {
      blocked = true;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
    return { executed: "hostileExecuted" in window, blocked, violations };
  });
  expect(result.executed).toBe(false);
  expect(result.blocked).toBe(true);
  expect(result.violations).toContain("script-src-elem");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Aller au contenu" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
});

test("mise à jour en attente sans rechargement ; activation après fermeture et données conservées", async ({
  page,
  context,
}) => {
  let generation = "a";
  let failAsset = false;
  const server = createServer(async (req, res) => {
    const pathname = new URL(req.url!, "http://localhost").pathname;
    if (!pathname.startsWith("/coachOS-dashboard/")) {
      res.writeHead(404).end();
      return;
    }
    const relative =
      pathname.slice("/coachOS-dashboard/".length) || "index.html";
    if (relative.includes("..")) {
      res.writeHead(404).end();
      return;
    }
    try {
      if (failAsset && relative === "icon-192.png") {
        res.writeHead(503).end();
        return;
      }
      let body = await readFile(resolve("dist", relative));
      if (relative === "sw.js")
        body = Buffer.from(
          body
            .toString()
            .replace(
              /(const CACHE = PREFIX \+ \x27)([a-f0-9]{16})/g,
              `$1$2-${generation}`,
            ),
        );
      const types: Record<string, string> = {
        ".js": "application/javascript",
        ".html": "text/html",
        ".css": "text/css",
        ".png": "image/png",
        ".svg": "image/svg+xml",
        ".webmanifest": "application/manifest+json",
      };
      res
        .writeHead(200, {
          "Content-Type":
            types[extname(relative)] ?? "application/octet-stream",
          "Cache-Control": "no-store",
        })
        .end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as { port: number };
  const url = `http://127.0.0.1:${address.port}/coachOS-dashboard/`;
  try {
    await page.goto(url);
    await ready(page);
    await offlineReady(page);
    await page.getByRole("searchbox").fill("stack");
    const old = await page.evaluate(async () =>
      (await caches.keys()).find((key) => key.startsWith("coachos-")),
    );
    // An incomplete new cache must leave the active version intact.
    failAsset = true;
    generation = "broken";
    await page.evaluate(async () => {
      const registration = (await navigator.serviceWorker.getRegistration())!;
      await new Promise<void>(async (resolve, reject) => {
        registration.addEventListener(
          "updatefound",
          () => {
            const worker = registration.installing!;
            worker.addEventListener("statechange", () => {
              if (worker.state === "redundant") resolve();
            });
          },
          { once: true },
        );
        try {
          await registration.update();
        } catch (error) {
          reject(error);
        }
      });
    });
    expect(
      await page.evaluate(async () =>
        (await caches.keys()).filter((key) => key.startsWith("coachos-")),
      ),
    ).toEqual([old]);
    await page.reload();
    await ready(page);
    await page.getByRole("searchbox").fill("stack");
    failAsset = false;
    generation = "b";
    await page.evaluate(async () => {
      await (await navigator.serviceWorker.getRegistration())!.update();
    });
    await expect
      .poll(() =>
        page.evaluate(
          async () =>
            !!(await navigator.serviceWorker.getRegistration())?.waiting,
        ),
      )
      .toBe(true);
    await page.locator(".offline-status summary").click();
    await expect(page.getByText(/Mise à jour prête/)).toBeVisible();
    await expect(page.getByRole("searchbox")).toHaveValue("stack");
    expect(
      await page.evaluate(
        async (key) => (await caches.keys()).includes(key!),
        old,
      ),
    ).toBe(true);
    await page.close();
    const next = await context.newPage();
    await next.goto(url);
    await ready(next);
    await expect(next.getByRole("article")).toHaveCount(8);
    await expect
      .poll(() =>
        next.evaluate(async () =>
          (await caches.keys()).filter((key) => key.startsWith("coachos-")),
        ),
      )
      .toEqual([old?.replace(/-a$/, "-b")]);
    await next.close();
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("accessibilité des trois espaces : aucun défaut sérieux ou critique", async ({
  page,
}) => {
  for (const route of [
    "",
    "#/editor?play=princeton",
    "#/presentation?play=princeton",
  ]) {
    await page.goto(route);
    await ready(page);
    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      ),
    ).toEqual([]);
  }
});
