import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { migrateSources } from "../src/migration/migrate";
import { parseHistoricalData } from "../src/migration/legacy-parser";
import { parseBoundedJson, validateLibrary } from "../src/model/validate";
import { sequence } from "../src/model/types";
import { curve } from "../src/components/PlayDiagram";

const html = readFileSync("sources/index_original.html", "utf8");
const stack = readFileSync("sources/stack_user_v2.json", "utf8");
const snapshot = JSON.parse(readFileSync("docs/source-snapshot.json", "utf8"));
const make = () => migrateSources(html, stack, "2026-11-12T00:00:00.000Z");

test("parseur sans exécution : extraction exacte du snapshot et rejet des expressions", () => {
  expect(parseHistoricalData(html)).toEqual(snapshot.historical);
  for (const [path, hash] of Object.entries(snapshot.sourceHashes))
    expect(createHash("sha256").update(readFileSync(path)).digest("hex")).toBe(
      hash,
    );
  for (const expression of [
    "globalThis.hacked=true",
    '[Function("return 1")()]',
    "[{__proto__:{}}]",
  ]) {
    expect(() =>
      parseHistoricalData(`const sets=${expression};\nlet active=`),
    ).toThrow();
  }
});

test("cinq systèmes, quatre lectures et conservation de toutes les géométries, textes et porteurs", () => {
  const library = make();
  expect(library.plays).toHaveLength(8);
  const migrated = library.plays.slice(0, 5);
  expect(migrated.map((p) => p.commonSteps.length)).toEqual([11, 2, 8, 13, 10]);
  expect(migrated[1].branches.map((b) => [b.name, b.steps.length])).toEqual([
    ["Jeu classique", 4],
    ["Mismatch 5", 3],
    ["Drive intérieur", 4],
    ["Drive extérieur", 4],
  ]);
  for (let pi = 0; pi < 5; pi++) {
    const p = migrated[pi],
      old = snapshot.historical[pi];
    expect(p.initialState.players).toEqual(old.start);
    expect(p.metadata.guidance).toBe(old.tip);
    const routes = old.variants ? Object.keys(old.variants) : [undefined];
    for (const key of routes) {
      const steps = sequence(p, key ? `${p.id}:branch:${key}` : undefined);
      const originals = old.steps ?? [...old.base, ...old.variants[key!].steps];
      let positions = structuredClone(old.start);
      let previous = structuredClone(p.initialState);
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i],
          source = originals[i];
        if (i > 0) Object.assign(positions, source.delta ?? {});
        expect(step.title).toBe(source.title);
        expect(step.note).toBe(source.desc);
        expect(step.beforeState).toEqual(previous);
        expect(step.afterState.players).toEqual(positions);
        expect(step.afterState.ball).toEqual({
          mode: "attached",
          carrierId: String(source.ball ?? old.ball),
        });
        expect(step.actions).toHaveLength((source.acts ?? []).length);
        for (let ai = 0; ai < step.actions.length; ai++) {
          const a = step.actions[ai],
            original = source.acts[ai];
          if (["m", "c"].includes(original.t)) {
            expect(a.geometry).toEqual({
              kind: "catmull-rom",
              points: [previous.players[String(original.id)], ...original.via],
            });
            expect(a.actorId).toBe(String(original.id));
          } else if (original.t === "p") {
            expect(a.geometry.points).toEqual([
              positions[String(original.a)],
              positions[String(original.b)],
            ]);
            expect(a.status).toBe("optional");
            expect(a.recipientId).toBe(String(original.b));
          } else {
            expect(a.geometry).toEqual({
              kind: "legacy-screen",
              points: [positions[String(original.id)]],
            });
          }
        }
        previous = step.afterState;
      }
    }
  }
});

test("Stack : les six étapes, 24 tracés, positions et notes sont inchangés et sans acteur inventé", () => {
  const p = make().plays[5];
  const raw = JSON.parse(stack);
  expect(p.status).toBe("needs-review");
  expect(p.court.dimensionsConfirmed).toBe(false);
  expect(p.branches).toEqual([]);
  expect(p.commonSteps).toHaveLength(6);
  expect(p.metadata.report.actions).toBe(24);
  p.commonSteps.forEach((s, i) => {
    expect(s.afterState.ball).toBeNull();
    expect(s.note).toBe(raw.steps[i].note);
    expect(s.afterState.players).toEqual(
      Object.fromEntries(
        raw.steps[i].players.map((v: { n: number; x: number; y: number }) => [
          String(v.n),
          [v.x, v.y],
        ]),
      ),
    );
    s.actions.forEach((a, j) => {
      const line = raw.steps[i].lines[j];
      expect(a.geometry.points).toEqual([
        [line.a.x, line.a.y],
        [line.b.x, line.b.y],
      ]);
      expect(a.kind).toBe(line.type);
      expect(a.actorId).toBeUndefined();
      expect(a.status).toBe("unassigned");
    });
  });
  expect(
    make()
      .plays.slice(6)
      .every((p) => p.status === "draft" && p.commonSteps.length === 0),
  ).toBe(true);
});

test("identités stables, copie JSON fidèle et courbes reproductibles", () => {
  const first = make(),
    second = make();
  expect(second).toEqual(first);
  expect(validateLibrary(parseBoundedJson(JSON.stringify(first)))).toEqual(
    first,
  );
  expect(
    curve([
      [0, 0],
      [6, 6],
      [12, 0],
    ]),
  ).toBe("M0 0 C1 1 4 6 6 6 C8 6 11 1 12 0");
});

test("validation : versions inconnues, références cassées, doublons, nombres et clés hostiles refusés", () => {
  const variants = [
    (v: ReturnType<typeof make>) => {
      v.plays[1].branches[0].steps[0].beforeState.players["1"] = [0, 0];
    },

    (v: ReturnType<typeof make>) => {
      v.librarySchemaVersion = 2 as 1;
    },
    (v: ReturnType<typeof make>) => {
      v.collections[0].playIds.push("absent");
    },
    (v: ReturnType<typeof make>) => {
      v.plays[1].branches[0].forkStepId = "absent";
    },
    (v: ReturnType<typeof make>) => {
      v.plays[0].initialState.players["1"][0] = Infinity;
    },
    (v: ReturnType<typeof make>) => {
      v.plays[0].commonSteps[0].afterState.players["1"] = [NaN, 0];
    },
    (v: ReturnType<typeof make>) => {
      v.plays.push(structuredClone(v.plays[0]));
    },
  ];
  for (const mutate of variants) {
    const v = make();
    mutate(v);
    expect(() => validateLibrary(v)).toThrow();
  }
  expect(() => parseBoundedJson('{"__proto__":{}}')).toThrow();
  expect(() => parseBoundedJson('{"constructor":{}}')).toThrow();
  expect(() =>
    parseBoundedJson("[".repeat(32) + "0" + "]".repeat(32)),
  ).toThrow();
  expect(() => parseBoundedJson(" ".repeat(4_000_001))).toThrow();
  const unknown = { ...make(), untrusted: "<script>alert(1)</script>" };
  expect(() => validateLibrary(unknown)).toThrow();
});
