import { renderToStaticMarkup } from "react-dom/server";
import { PlayDiagram } from "../components/PlayDiagram";
import type { Library, Play, Step } from "../model/types";
import { decodedLogo } from "./logo";
import { safeName } from "./formats";
export interface ExportStage {
  play: Play;
  step?: Step;
  label: string;
  first: boolean;
}
export function stages(play: Play): ExportStage[] {
  const entries: ExportStage[] = play.commonSteps.map((step, i) => ({
    play,
    step,
    label: `Tronc commun · Étape ${i + 1}`,
    first: i === 0,
  }));
  for (const b of play.branches) {
    const fork = play.commonSteps.findIndex((s) => s.id === b.forkStepId) + 1;
    for (let i = 0; i < b.steps.length; i++)
      entries.push({
        play,
        step: b.steps[i],
        label: `Lecture « ${b.name} » · Étape ${i + 1} · Après l’étape commune ${fork}`,
        first: false,
      });
  }
  return entries.length
    ? entries
    : [{ play, label: "Brouillon · aucune étape définie", first: true }];
}
function context(canvas: HTMLCanvasElement) {
  const c = canvas.getContext("2d");
  if (!c) throw new Error("Le navigateur ne peut pas préparer les images.");
  return c;
}
function blob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) =>
        b
          ? resolve(b)
          : reject(new Error("Image trop volumineuse pour ce navigateur.")),
      "image/png",
    ),
  );
}
const font = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export function wrap(
  ctx: CanvasRenderingContext2D,
  value: string,
  width: number,
): string[] {
  const lines: string[] = [];
  for (const paragraph of value.split("\n")) {
    if (!paragraph) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of paragraph.match(/\S+\s*|\s+/g) ?? []) {
      if (ctx.measureText(line + word).width <= width) {
        line += word;
        continue;
      }
      if (line.trim()) {
        lines.push(line.trimEnd());
        line = "";
      }
      if (ctx.measureText(word).width <= width) {
        line = word.trimStart();
        continue;
      }
      for (const char of Array.from(word)) {
        if (ctx.measureText(line + char).width > width && line) {
          lines.push(line);
          line = "";
        }
        line += char;
      }
    }
    if (line || !lines.length) lines.push(line.trimEnd());
  }
  return lines;
}
async function diagram(
  play: Play,
  step: Step,
  scale: number,
): Promise<HTMLCanvasElement> {
  const markup = renderToStaticMarkup(
    <PlayDiagram play={play} step={step} />,
  ).replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  const doc = new DOMParser().parseFromString(markup, "image/svg+xml");
  const svg = doc.documentElement as unknown as SVGSVGElement;
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const wrapper = document.createElement("div");
  wrapper.style.cssText =
    "position:absolute;left:-100000px;top:0;visibility:hidden;pointer-events:none";
  wrapper.append(svg);
  document.body.append(wrapper);
  let box: { x: number; y: number; width: number; height: number };
  try {
    const base = svg.viewBox.baseVal;
    const actual = svg.getBBox();
    const pad = play.court.coordinateSpace === "stack-raw" ? 24 : 50;
    const left = Math.min(base.x, actual.x - pad),
      top = Math.min(base.y, actual.y - pad),
      right = Math.max(base.x + base.width, actual.x + actual.width + pad),
      bottom = Math.max(base.y + base.height, actual.y + actual.height + pad);
    box = { x: left, y: top, width: right - left, height: bottom - top };
    for (const el of [
      svg,
      ...Array.from(svg.querySelectorAll<SVGElement>("*")),
    ]) {
      const style = getComputedStyle(el);
      for (const key of [
        "fill",
        "fill-opacity",
        "stroke",
        "stroke-width",
        "stroke-dasharray",
        "stroke-linecap",
        "stroke-linejoin",
        "opacity",
        "color",
        "font-family",
        "font-size",
        "font-weight",
        "text-anchor",
        "dominant-baseline",
        "paint-order",
      ])
        el.style.setProperty(key, style.getPropertyValue(key));
    }
  } finally {
    wrapper.remove();
  }
  const factor = Math.min(
    scale,
    4096 / box.width,
    8192 / box.height,
    Math.sqrt(12_000_000 / (box.width * box.height)),
  );
  const width = Math.max(1, Math.ceil(box.width * factor)),
    height = Math.max(1, Math.ceil(box.height * factor));
  svg.setAttribute("viewBox", `${box.x} ${box.y} ${box.width} ${box.height}`);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  const serialized = new XMLSerializer().serializeToString(svg);
  const url = URL.createObjectURL(
    new Blob([serialized], { type: "image/svg+xml;charset=utf-8" }),
  );
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = context(canvas);
    ctx.fillStyle = "#f5f8fd";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}
async function heading(
  entry: ExportStage,
  library: Library,
  width: number,
  continuation = false,
) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = 1;
  const ctx = context(canvas);
  const pad = 32;
  const logo = library.profile?.logoDataUrl
    ? await decodedLogo(library.profile.logoDataUrl)
    : undefined;
  const blocks: [string, number, number][] = [
    [entry.play.name, 32, 700],
    [
      continuation ? "Notes · suite" : (entry.step?.title ?? "Brouillon"),
      27,
      600,
    ],
    [entry.label, 21, 500],
  ];
  if (library.profile?.coachName || library.profile?.team)
    blocks.push([
      [library.profile.coachName, library.profile.team]
        .filter(Boolean)
        .join(" · "),
      20,
      400,
    ]);
  blocks.push([
    entry.play.court.coordinateSpace === "stack-raw"
      ? "Repère source · dimensions à confirmer"
      : entry.play.court.kind === "full"
        ? "Terrain entier"
        : "Demi-terrain",
    18,
    400,
  ]);
  if (entry.step?.actions.some((a) => a.status === "confirmed"))
    blocks.push([
      "Passe confirmée : " +
        entry.step.actions
          .filter((a) => a.status === "confirmed")
          .map((a) => `${a.actorId} → ${a.recipientId}`)
          .join(", "),
      18,
      400,
    ]);
  const prepared = blocks.map(([text, size, weight]) => {
    ctx.font = `${weight} ${size}px ${font}`;
    return {
      lines: wrap(ctx, text, width - pad * 2 - (logo ? 112 : 0)),
      size,
      weight,
    };
  });
  canvas.height = Math.ceil(
    pad * 2 +
      prepared.reduce((n, b) => n + b.lines.length * (b.size + 9) + 6, 0),
  );
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#123766";
  ctx.textBaseline = "top";
  let y = pad;
  for (const b of prepared) {
    ctx.font = `${b.weight} ${b.size}px ${font}`;
    for (const line of b.lines) {
      ctx.fillText(line, pad, y);
      y += b.size + 9;
    }
    y += 6;
  }
  if (logo) {
    const fit = Math.min(96 / logo.naturalWidth, 96 / logo.naturalHeight);
    ctx.drawImage(
      logo,
      width - pad - logo.naturalWidth * fit,
      pad,
      logo.naturalWidth * fit,
      logo.naturalHeight * fit,
    );
  }
  return canvas;
}
export async function exportPng(
  entry: ExportStage,
  library: Library,
): Promise<File> {
  if (!entry.step)
    throw new Error("Ajoutez une étape avant d’exporter un PNG.");
  const image = await diagram(
    entry.play,
    entry.step,
    library.preferences.pngScale ?? 2,
  );
  const header = await heading(entry, library, Math.max(750, image.width));
  const canvas = document.createElement("canvas");
  canvas.width = header.width;
  canvas.height = header.height + image.height + 70;
  if (canvas.width * canvas.height > 16_000_000 || canvas.height > 16384)
    throw new Error(
      "Dessin trop allongé pour un PNG unique. Utilisez le PDF ou rapprochez les éléments.",
    );
  const ctx = context(canvas);
  ctx.fillStyle = "#f5f8fd";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(header, 0, 0);
  ctx.drawImage(image, (canvas.width - image.width) / 2, header.height);
  ctx.fillStyle = "#34577f";
  ctx.font = `18px ${font}`;
  ctx.fillText(
    "Bleu : course · Ambre : cut · Pointillés : passe · Barre : écran",
    24,
    canvas.height - 28,
  );
  return new File(
    [await blob(canvas)],
    `${safeName(entry.play.name)}-${safeName(entry.step.title)}.png`,
    { type: "image/png" },
  );
}
const paintLines = (lines: string[], width: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = lines.length * 32 + 12;
  const ctx = context(canvas);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, canvas.height);
  ctx.fillStyle = "#123766";
  ctx.font = `24px ${font}`;
  ctx.textBaseline = "top";
  lines.forEach((line, i) => ctx.fillText(line, 0, i * 32));
  return canvas;
};
export async function exportPdf(
  plays: Play[],
  library: Library,
  onProgress?: (completed: number, total: number) => void,
  signal?: AbortSignal,
): Promise<File> {
  if (!plays.length) throw new Error("Sélectionnez au moins un système.");
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  doc.setTitle(
    plays.length === 1 ? plays[0].name : "CoachOS — sélection de systèmes",
  );
  doc.setCreator("CoachOS");
  const pageFont = await doc.embedFont(StandardFonts.Helvetica);
  const entries = plays.flatMap(stages);
  let completed = 0;
  for (const entry of entries) {
    signal?.throwIfAborted();
    const orientation = library.preferences.exportOrientation ?? "auto";
    const landscape =
      orientation === "landscape" ||
      (orientation === "auto" &&
        library.preferences.includeNotes === false &&
        entry.play.court.kind === "half");
    const width = landscape ? 841.89 : 595.28,
      height = landscape ? 595.28 : 841.89,
      margin = 26;
    const header = await heading(
      entry,
      library,
      Math.round((width - 2 * margin) * 2),
    );
    const headerBytes = await (await blob(header)).arrayBuffer();
    const embeddedHeader = await doc.embedPng(headerBytes);
    const headerHeight = header.height / 2;
    let page = doc.addPage([width, height]);
    let top = height - margin;
    page.drawImage(embeddedHeader, {
      x: margin,
      y: top - headerHeight,
      width: width - 2 * margin,
      height: headerHeight,
    });
    top -= headerHeight + 10;
    let note =
      library.preferences.includeNotes === false
        ? ""
        : (entry.step?.note ?? entry.play.metadata.description);
    if (library.preferences.includeNotes !== false) {
      if (entry.step?.flags.length)
        note += "\n\nSource — à vérifier :\n" + entry.step.flags.join("\n");
      if (entry.first && entry.play.metadata.guidance)
        note += "\n\nConseils du système :\n" + entry.play.metadata.guidance;
    }
    if (entry.step) {
      const image = await diagram(
        entry.play,
        entry.step,
        Math.min(1.5, library.preferences.pngScale ?? 2),
      );
      const png = await doc.embedPng(await (await blob(image)).arrayBuffer());
      const available = Math.max(40, top - margin - 24);
      const maxH =
        note && !landscape && entry.play.court.kind === "half"
          ? available * 0.72
          : available;
      const factor = Math.min(
        (width - 2 * margin) / image.width,
        maxH / image.height,
      );
      const drawW = image.width * factor,
        drawH = image.height * factor;
      page.drawImage(png, {
        x: (width - drawW) / 2,
        y: top - drawH,
        width: drawW,
        height: drawH,
      });
      top -= drawH + 12;
    }
    if (note) {
      const measure = document.createElement("canvas");
      const ctx = context(measure);
      ctx.font = `24px ${font}`;
      let lines = wrap(ctx, note, Math.round((width - 2 * margin) * 2));
      while (lines.length) {
        signal?.throwIfAborted();
        let count = Math.floor((top - margin - 24) / 16);
        if (count < 1) {
          page = doc.addPage([width, height]);
          const continuation = await heading(
            entry,
            library,
            Math.round((width - 2 * margin) * 2),
            true,
          );
          const img = await doc.embedPng(
            await (await blob(continuation)).arrayBuffer(),
          );
          page.drawImage(img, {
            x: margin,
            y: height - margin - continuation.height / 2,
            width: width - 2 * margin,
            height: continuation.height / 2,
          });
          top = height - margin - continuation.height / 2 - 12;
          count = Math.max(1, Math.floor((top - margin - 24) / 16));
        }
        const chunk = lines.splice(0, count);
        const text = paintLines(chunk, Math.round((width - 2 * margin) * 2));
        const image = await doc.embedPng(
          await (await blob(text)).arrayBuffer(),
        );
        page.drawImage(image, {
          x: margin,
          y: top - text.height / 2,
          width: width - 2 * margin,
          height: text.height / 2,
        });
        top -= text.height / 2 + 8;
      }
    }
    completed++;
    onProgress?.(completed, entries.length);
    await new Promise((r) => setTimeout(r, 0));
  }
  const pages = doc.getPages();
  pages.forEach((page, i) =>
    page.drawText(`${i + 1} / ${pages.length}`, {
      x: 26,
      y: 13,
      size: 8,
      font: pageFont,
      color: rgb(0.25, 0.34, 0.47),
    }),
  );
  signal?.throwIfAborted();
  const bytes = await doc.save();
  return new File(
    [new Uint8Array(bytes)],
    `${safeName(plays.length === 1 ? plays[0].name : "CoachOS-selection")}.pdf`,
    { type: "application/pdf" },
  );
}
