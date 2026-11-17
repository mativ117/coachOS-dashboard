import { t } from "../i18n";
import { cleanStroke, strokeKind } from "./cleanStroke";
import { fittedBox } from "./viewport";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { Play, Point, Step } from "../model/types";
import { bounds, curve, PlayDiagram } from "../components/PlayDiagram";
export type Tool =
  | "select"
  | "run"
  | "curve"
  | "pass"
  | "screen"
  | "screen-curve"
  | "erase"
  | "annotation";
export type Selection =
  | { kind: "player" | "defender"; id: string }
  | { kind: "action"; id: string; point: number }
  | { kind: "ball" }
  | null;
export function EditorCanvas({
  play,
  step,
  tool,
  selected,
  onSelect,
  onMove,
  onPoint,
  onDraw,
  onErase,
  onAnnotation,
  onBallDrop,
  disabled = false,
}: {
  play: Play;
  step: Step;
  tool: Tool;
  selected: Selection;
  onSelect: (s: Selection) => void;
  onMove: (id: string, p: Point, defender: boolean) => void;
  onPoint: (id: string, index: number, p: Point) => void;
  onDraw: (
    tool: Tool,
    points: Point[],
    actor?: string,
    recipient?: string,
    shape?: "polyline",
  ) => void;
  onErase: (id: string) => void;
  onAnnotation: (p: Point) => void;
  onBallDrop: (p: Point, carrier?: string) => void;
  disabled?: boolean;
}) {
  const svg = useRef<SVGSVGElement | null>(null);
  const [pending, setPending] = useState<Point[]>([]);
  const ink = useRef<{
    pointer: number;
    points: Point[];
    actor?: string;
    client: Point;
    scale: number;
    fromPending: boolean;
    moved: boolean;
  } | null>(null);
  const [inkPreview, setInkPreview] = useState<Point[]>([]);
  const [actor, setActor] = useState<string>();
  const [preview, setPreview] = useState<{
    kind: "player" | "defender" | "point" | "ball";
    id: string;
    index?: number;
    point: Point;
  } | null>(null);
  const drag = useRef<{
    selection: NonNullable<Selection>;
    start: Point;
    client: Point;
    moved: boolean;
    empty: boolean;
  } | null>(null);
  const fixedBounds = useRef(bounds(play));
  const raw = play.court.coordinateSpace === "stack-raw";
  const baseBox = raw
    ? fixedBounds.current
    : play.court.kind === "full"
      ? "0 0 750 1215"
      : "0 0 750 655";
  const [camera, setCamera] = useState({
    source: baseBox,
    frame: baseBox,
    zoom: 1,
    x: 0,
    y: 0,
  });
  const [pan, setPan] = useState(false);
  const panDrag = useRef<{
    client: Point;
    x: number;
    y: number;
    scale: number;
  } | null>(null);
  const view =
    camera.source === baseBox
      ? camera
      : { source: baseBox, frame: baseBox, zoom: 1, x: 0, y: 0 };
  const [bx, by, bw, bh] = view.frame.split(" ").map(Number);
  const box = `${bx + bw / 2 - bw / view.zoom / 2 + view.x} ${by + bh / 2 - bh / view.zoom / 2 + view.y} ${bw / view.zoom} ${bh / view.zoom}`;
  useEffect(() => {
    setPending([]);
    setActor(undefined);
    ink.current = null;
    setInkPreview([]);
    drag.current = null;
    setPreview(null);
  }, [tool, step.id]);
  useEffect(() => {
    const cancel = (event: KeyboardEvent) => {
      if (
        event.key !== "Escape" ||
        (event.target as Element)?.closest?.("input,textarea,select")
      )
        return;
      ink.current = null;
      drag.current = null;
      setInkPreview([]);
      setPending([]);
      setActor(undefined);
      setPreview(null);
    };
    addEventListener("keydown", cancel);
    return () => removeEventListener("keydown", cancel);
  }, []);
  function keyboardMove(
    event: React.KeyboardEvent,
    selection: NonNullable<Selection>,
    position: Point,
  ) {
    if (disabled) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(selection);
      return;
    }
    const directions: Record<string, Point> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const d = directions[event.key];
    if (!d) return;
    event.preventDefault();
    event.stopPropagation();
    const amount = (raw ? 1 : 5) * (event.shiftKey ? 5 : 1);
    const point: Point = [
      position[0] + d[0] * amount,
      position[1] + d[1] * amount,
    ];
    onSelect(selection);
    if (selection.kind === "ball") onBallDrop(point);
    else if (selection.kind === "action")
      onPoint(selection.id, selection.point, point);
    else onMove(selection.id, point, selection.kind === "defender");
  }
  const getPoint = (e: PointerEvent<SVGSVGElement>): Point => {
    const matrix = e.currentTarget.getScreenCTM();
    if (!matrix) return [0, 0];
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(
      matrix.inverse(),
    );
    const [x, y, w, h] = box.split(" ").map(Number);
    return [
      Math.round(Math.min(x + w - 12, Math.max(x + 12, pt.x)) * 10) / 10,
      Math.round(Math.min(y + h - 12, Math.max(y + 12, pt.y)) * 10) / 10,
    ];
  };
  const nearest = (p: Point, includeDefenders = true): Selection => {
    const scale = svg.current?.getScreenCTM()?.a ?? 1;
    let best = 26 / scale,
      found: Selection = null;
    for (const [kind, positions] of [
      ["player", step.afterState.players],
      ...(includeDefenders
        ? [["defender", step.afterState.defenders ?? {}]]
        : []),
    ] as ["player" | "defender", Record<string, Point>][])
      for (const [id, pos] of Object.entries(positions)) {
        const d = Math.hypot(pos[0] - p[0], pos[1] - p[1]);
        if (d < best) {
          best = d;
          found = { kind, id };
        }
      }
    return found;
  };
  const down = (e: PointerEvent<SVGSVGElement>) => {
    if (
      disabled ||
      e.button !== 0 ||
      ink.current ||
      drag.current ||
      panDrag.current
    )
      return;
    e.preventDefault();
    svg.current = e.currentTarget;
    e.currentTarget.setPointerCapture(e.pointerId);
    if (pan) {
      panDrag.current = {
        client: [e.clientX, e.clientY],
        x: view.x,
        y: view.y,
        scale: e.currentTarget.getScreenCTM()?.a ?? 1,
      };
      return;
    }
    const p = getPoint(e);
    const ball = step.afterState.ball;
    const ballPosition: Point | undefined =
      ball?.mode === "free"
        ? ball.position
        : ball?.mode === "attached"
          ? [
              step.afterState.players[ball.carrierId][0] + (raw ? 11 : 22),
              step.afterState.players[ball.carrierId][1] + (raw ? 7 : 14),
            ]
          : undefined;
    const near = nearest(p);
    const nearPosition =
      near?.kind === "player"
        ? step.afterState.players[near.id]
        : near?.kind === "defender"
          ? step.afterState.defenders?.[near.id]
          : undefined;
    const ballIsCloser =
      ballPosition &&
      (!nearPosition ||
        Math.hypot(p[0] - ballPosition[0], p[1] - ballPosition[1]) <
          Math.hypot(p[0] - nearPosition[0], p[1] - nearPosition[1]));
    if (
      tool === "select" &&
      ballIsCloser &&
      (e.target as Element).closest("[data-board-ball]")
    ) {
      onSelect({ kind: "ball" });
      drag.current = {
        selection: { kind: "ball" },
        start: p,
        client: [e.clientX, e.clientY],
        moved: false,
        empty: false,
      };
      return;
    }
    if (tool === "select" && selected?.kind === "ball") {
      drag.current = {
        selection: selected,
        start: p,
        client: [e.clientX, e.clientY],
        moved: false,
        empty: true,
      };
      return;
    }
    const hit = (e.target as Element).closest("[data-handle]");
    if (hit && selected?.kind === "action") {
      const point = Number(hit.getAttribute("data-handle"));
      const sel = { ...selected, point };
      onSelect(sel);
      drag.current = {
        selection: sel,
        start: p,
        client: [e.clientX, e.clientY],
        moved: false,
        empty: false,
      };
      return;
    }
    const player =
      tool === "select" || tool === "pass" || pending.length === 0
        ? nearest(p, tool === "select")
        : null;
    const hitAction = (e.target as Element)
      .closest("[data-select-action]")
      ?.getAttribute("data-select-action");
    if (tool === "erase") {
      if (hitAction) onErase(hitAction);
      return;
    }
    if (tool === "annotation") {
      onAnnotation(p);
      return;
    }
    if (["run", "screen", "pass"].includes(tool)) {
      if (hitAction && !player && !pending.length) {
        onSelect({ kind: "action", id: hitAction, point: 0 });
        return;
      }
      const start =
        pending[0] ??
        (player?.kind === "player" ? step.afterState.players[player.id] : p);
      ink.current = {
        pointer: e.pointerId,
        points: [start],
        actor: pending.length
          ? actor
          : player?.kind === "player"
            ? player.id
            : undefined,
        client: [e.clientX, e.clientY],
        scale: e.currentTarget.getScreenCTM()?.a ?? 1,
        fromPending: !!pending.length,
        moved: false,
      };
      return;
    }
    if (tool !== "select") {
      const next = pending.length
        ? [
            ...pending,
            player?.kind === "player" ? step.afterState.players[player.id] : p,
          ]
        : [player?.kind === "player" ? step.afterState.players[player.id] : p];
      const nextActor = pending.length
        ? actor
        : player?.kind === "player"
          ? player.id
          : undefined;
      if (!pending.length) {
        setActor(nextActor);
        if (player) onSelect(player);
      }
      const count = tool === "curve" || tool === "screen-curve" ? 3 : 2;
      if (next.length === count) {
        onDraw(
          tool,
          next,
          nextActor,
          player?.kind === "player" ? player.id : undefined,
        );
        setPending([]);
        setActor(undefined);
      } else setPending(next);
      return;
    }
    if (player) {
      onSelect(player);
      drag.current = {
        selection: player,
        start: p,
        client: [e.clientX, e.clientY],
        moved: false,
        empty: false,
      };
    } else if (hitAction) {
      onSelect({ kind: "action", id: hitAction, point: 0 });
    } else if (selected) {
      drag.current = {
        selection: selected,
        start: p,
        client: [e.clientX, e.clientY],
        moved: false,
        empty: true,
      };
    }
  };
  const move = (e: PointerEvent<SVGSVGElement>) => {
    if (ink.current) {
      const stroke = ink.current;
      if (e.pointerId !== stroke.pointer) return;
      if (
        Math.hypot(e.clientX - stroke.client[0], e.clientY - stroke.client[1]) >
        5
      )
        stroke.moved = true;
      const p = getPoint(e),
        last = stroke.points.at(-1)!;
      if (Math.hypot(p[0] - last[0], p[1] - last[1]) * stroke.scale >= 1) {
        stroke.points.push(p);
        if (stroke.points.length > 2048)
          stroke.points = stroke.points.filter(
            (_, i) => i === 0 || i % 2 === 1,
          );
        setInkPreview([...stroke.points]);
      }
      return;
    }
    if (panDrag.current) {
      const d = panDrag.current;
      setCamera({
        ...view,
        x: d.x - (e.clientX - d.client[0]) / d.scale,
        y: d.y - (e.clientY - d.client[1]) / d.scale,
      });
      return;
    }
    const d = drag.current;
    if (!d) return;
    const p = getPoint(e);
    if (Math.hypot(e.clientX - d.client[0], e.clientY - d.client[1]) > 3)
      d.moved = true;
    const s = d.selection;
    if (d.moved)
      setPreview(
        s.kind === "action"
          ? { kind: "point", id: s.id, index: s.point, point: p }
          : s.kind === "ball"
            ? { kind: "ball", id: "", point: p }
            : { kind: s.kind, id: s.id, point: p },
      );
  };
  const up = (e: PointerEvent<SVGSVGElement>) => {
    if (ink.current) {
      const stroke = ink.current;
      if (e.pointerId !== stroke.pointer) return;
      ink.current = null;
      setInkPreview([]);
      const p = getPoint(e);
      if (stroke.moved || stroke.fromPending) {
        const recipient = tool === "pass" ? nearest(p, false) : null;
        const end =
          recipient?.kind === "player"
            ? step.afterState.players[recipient.id]
            : p;
        const points =
          tool === "pass"
            ? [stroke.points[0], end]
            : cleanStroke([...stroke.points, end], stroke.scale);
        setPending([]);
        setActor(undefined);
        if (
          points.length >= 2 &&
          points.some(
            (q) =>
              Math.hypot(q[0] - points[0][0], q[1] - points[0][1]) *
                stroke.scale >
              5,
          )
        )
          onDraw(
            tool === "screen" && points.length > 2
              ? "screen-curve"
              : tool === "run" && points.length > 2
                ? "curve"
                : tool,
            points,
            stroke.actor,
            recipient?.kind === "player" ? recipient.id : undefined,
            tool !== "pass" && strokeKind(points, stroke.scale) === "polyline"
              ? "polyline"
              : undefined,
          );
      } else {
        setPending(stroke.points);
        setActor(stroke.actor);
        if (stroke.actor) onSelect({ kind: "player", id: stroke.actor });
      }
      return;
    }
    if (panDrag.current) {
      panDrag.current = null;
      return;
    }
    const d = drag.current;
    drag.current = null;
    setPreview(null);
    if (!d || (!d.moved && !d.empty)) return;
    const p = getPoint(e),
      s = d.selection;
    if (s.kind === "action") onPoint(s.id, s.point, p);
    else if (s.kind === "ball") {
      const recipient = nearest(p, false);
      onBallDrop(p, recipient?.kind === "player" ? recipient.id : undefined);
      onSelect(null);
    } else onMove(s.id, p, s.kind === "defender");
  };
  const shown = preview ? structuredClone(step) : step;
  if (preview) {
    if (preview.kind === "player")
      shown.afterState.players[preview.id] = preview.point;
    else if (preview.kind === "defender")
      (shown.afterState.defenders ??= {})[preview.id] = preview.point;
    else if (preview.kind === "ball")
      shown.afterState.ball = { mode: "free", position: preview.point };
    else {
      const a = shown.actions.find((a) => a.id === preview.id);
      if (a) a.geometry.points[preview.index!] = preview.point;
    }
  }
  const selectedAction =
    selected?.kind === "action"
      ? shown.actions.find((a) => a.id === selected.id)
      : undefined;
  const radius = raw ? 5 : 11;
  return (
    <div
      className={`board-workspace ${play.court.kind === "full" ? "full-board" : ""}`}
    >
      <p id="board-keyboard" className="sr-only">
        {t(
          "Au clavier : Tab pour choisir un élément, flèches pour le déplacer, Maj pour un pas plus grand.",
        )}
      </p>
      <div className="editor-surface" data-tool={pan ? "pan" : tool}>
        <PlayDiagram
          play={play}
          step={shown}
          viewBox={box}
          svgProps={{
            onPointerDown: down,
            onPointerMove: move,
            onPointerUp: up,
            onPointerCancel: () => {
              drag.current = null;
              panDrag.current = null;
              ink.current = null;
              setInkPreview([]);
              setPending([]);
              setActor(undefined);
              setPreview(null);
            },
            onLostPointerCapture: () => {
              if (ink.current) {
                ink.current = null;
                setInkPreview([]);
              }
              if (drag.current) {
                drag.current = null;
                setPreview(null);
              }
            },
            ref: svg,
            role: "group",
            "aria-labelledby": undefined,
            "aria-label": t("Terrain interactif"),
            onKeyDown: (e) => {
              if (e.key === "Escape") {
                setPending([]);
                setActor(undefined);
                onSelect(null);
              }
            },
          }}
          overlay={
            <g className="editor-overlays">
              {step.actions
                .filter((a) => a.kind !== "annotation")
                .map((a) => (
                  <path
                    key={a.id}
                    data-select-action={a.id}
                    role="button"
                    tabIndex={disabled ? -1 : 0}
                    aria-label={t(
                      "Sélectionner le tracé {0}",
                      step.actions.indexOf(a) + 1,
                    )}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelect({ kind: "action", id: a.id, point: 0 });
                      }
                    }}
                    d={
                      a.geometry.kind === "legacy-screen"
                        ? `M${a.geometry.points[0][0] + 24} ${a.geometry.points[0][1] - 17}V${a.geometry.points[0][1] + 17}H${a.geometry.points[0][0] + 5}`
                        : a.geometry.kind === "polyline"
                          ? `M${a.geometry.points.map((p) => p.join(" ")).join("L")}`
                          : curve(a.geometry.points)
                    }
                    fill="none"
                    stroke="transparent"
                    strokeWidth="22"
                    vectorEffect="non-scaling-stroke"
                    pointerEvents="stroke"
                  />
                ))}
              {Object.entries(shown.afterState.players).map(([id, p]) => (
                <circle
                  key={`hit-${id}`}
                  data-board-player={id}
                  cx={p[0]}
                  cy={p[1]}
                  r={raw ? 10 : 21}
                  fill="transparent"
                  role="button"
                  tabIndex={disabled ? -1 : 0}
                  aria-label={t("Déplacer joueur {0}", id)}
                  aria-describedby="board-keyboard"
                  onKeyDown={(e) => keyboardMove(e, { kind: "player", id }, p)}
                  className="board-target"
                />
              ))}
              {Object.entries(shown.afterState.defenders ?? {}).map(
                ([id, p]) => (
                  <circle
                    key={`def-${id}`}
                    cx={p[0]}
                    cy={p[1]}
                    r={raw ? 10 : 21}
                    fill="transparent"
                    role="button"
                    tabIndex={disabled ? -1 : 0}
                    aria-label={t("Déplacer défenseur {0}", id)}
                    aria-describedby="board-keyboard"
                    onKeyDown={(e) =>
                      keyboardMove(e, { kind: "defender", id }, p)
                    }
                    className="board-target"
                  />
                ),
              )}
              {shown.afterState.ball &&
                (() => {
                  const ball = shown.afterState.ball;
                  const p: Point =
                    ball.mode === "free"
                      ? ball.position
                      : [
                          shown.afterState.players[ball.carrierId][0] +
                            (raw ? 11 : 22),
                          shown.afterState.players[ball.carrierId][1] +
                            (raw ? 7 : 14),
                        ];
                  return (
                    <circle
                      data-board-ball=""
                      pointerEvents={tool === "select" ? "auto" : "none"}
                      stroke="transparent"
                      strokeWidth="24"
                      vectorEffect="non-scaling-stroke"
                      cx={p[0]}
                      cy={p[1]}
                      r={raw ? 6 : 12}
                      fill="transparent"
                      role="button"
                      tabIndex={disabled ? -1 : 0}
                      aria-label={t("Déplacer le ballon")}
                      aria-describedby="board-keyboard"
                      className="board-target"
                      onKeyDown={(e) => keyboardMove(e, { kind: "ball" }, p)}
                    />
                  );
                })()}
              {(selectedAction?.kind === "pass"
                ? undefined
                : selectedAction
              )?.geometry.points.map((p, i) => (
                <circle
                  key={i}
                  data-handle={i}
                  cx={p[0]}
                  cy={p[1]}
                  r={radius}
                  role="button"
                  tabIndex={disabled ? -1 : 0}
                  aria-label={t("Déplacer le point {0}", i + 1)}
                  onKeyDown={(e) =>
                    keyboardMove(
                      e,
                      { kind: "action", id: selectedAction!.id, point: i },
                      p,
                    )
                  }
                  className={
                    selected?.kind === "action" && selected.point === i
                      ? "point-handle active"
                      : "point-handle"
                  }
                />
              ))}
              {selected &&
                (selected.kind === "player" || selected.kind === "defender") &&
                (() => {
                  const p =
                    selected.kind === "player"
                      ? shown.afterState.players[selected.id]
                      : shown.afterState.defenders?.[selected.id];
                  return p ? (
                    <circle
                      cx={p[0]}
                      cy={p[1]}
                      r={raw ? 14 : 29}
                      className="selection-ring"
                      pointerEvents="none"
                    />
                  ) : null;
                })()}
              {inkPreview.length > 1 && (
                <path
                  data-live-ink=""
                  d={curve(inkPreview)}
                  fill="none"
                  stroke="#1762c8"
                  strokeWidth={raw ? 2.3 : 4.3}
                  strokeLinecap="round"
                  pointerEvents="none"
                />
              )}
              {pending.map((p, i) => (
                <circle
                  key={i}
                  cx={p[0]}
                  cy={p[1]}
                  r={radius * 0.7}
                  className="point-handle"
                  pointerEvents="none"
                />
              ))}
              {pending.length > 1 && (
                <path
                  d={curve(pending)}
                  fill="none"
                  stroke="#1762c8"
                  strokeWidth={raw ? 2 : 3}
                  strokeDasharray="5 4"
                  pointerEvents="none"
                />
              )}
            </g>
          }
        />
        {pending.length > 0 && (
          <button
            className="cancel-draw"
            onClick={() => {
              setPending([]);
              setActor(undefined);
            }}
          >
            {t("Annuler le tracé (")}
            {pending.length}
            {t(")")}
          </button>
        )}
      </div>
      <details className="board-view-menu" name="board-overlays">
        <summary>{t("Vue")}</summary>{" "}
        <div
          className="board-view-controls"
          role="group"
          aria-label={t("Cadrage du terrain")}
        >
          <button
            aria-label={t("Vue entière")}
            onClick={() => {
              setCamera({
                source: baseBox,
                frame: baseBox,
                zoom: 1,
                x: 0,
                y: 0,
              });
              setPan(false);
            }}
          >
            {t("Vue entière")}
          </button>
          <button
            disabled={view.zoom <= 1}
            aria-label={t("Réduire le zoom")}
            onClick={() =>
              setCamera({ ...view, zoom: Math.max(1, view.zoom - 0.5) })
            }
          >
            {t("−")}
          </button>
          <span aria-live="polite">
            {Math.round(view.zoom * 100)} {t("%")}
          </span>
          <button
            disabled={view.zoom >= 3}
            aria-label={t("Agrandir le terrain")}
            onClick={() =>
              setCamera({ ...view, zoom: Math.min(3, view.zoom + 0.5) })
            }
          >
            {t("+")}
          </button>
          {(view.zoom > 1 || pan) && (
            <button aria-pressed={pan} onClick={() => setPan(!pan)}>
              {t("Déplacer la vue")}
            </button>
          )}
          <button
            aria-label={t("Recadrer — voir tous les éléments")}
            onClick={() => {
              setCamera({
                source: baseBox,
                frame: fittedBox(play, baseBox),
                zoom: 1,
                x: 0,
                y: 0,
              });
              setPan(false);
            }}
          >
            {t("Recadrer")}
          </button>
        </div>
      </details>
    </div>
  );
}
