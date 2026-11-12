import { useRef, useState, type PointerEvent } from "react";
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
  onFreeBall,
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
  ) => void;
  onErase: (id: string) => void;
  onAnnotation: (p: Point) => void;
  onFreeBall: (p: Point) => void;
  disabled?: boolean;
}) {
  const svg = useRef<SVGSVGElement | null>(null);
  const [pending, setPending] = useState<Point[]>([]);
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
  const box = raw
    ? fixedBounds.current
    : play.court.kind === "full"
      ? "0 0 750 1215"
      : "0 0 750 655";
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
    if (disabled || e.button !== 0) return;
    e.preventDefault();
    svg.current = e.currentTarget;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = getPoint(e);
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
    const player = nearest(p, tool === "select");
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
    const d = drag.current;
    drag.current = null;
    setPreview(null);
    if (!d || (!d.moved && !d.empty)) return;
    const p = getPoint(e),
      s = d.selection;
    if (s.kind === "action") onPoint(s.id, s.point, p);
    else if (s.kind === "ball") onFreeBall(p);
    else onMove(s.id, p, s.kind === "defender");
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
    <div className="editor-surface" data-tool={tool}>
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
            setPreview(null);
          },
          ref: svg,
        }}
        overlay={
          <g className="editor-overlays">
            {step.actions
              .filter((a) => a.kind !== "annotation")
              .map((a) => (
                <path
                  key={a.id}
                  data-select-action={a.id}
                  d={
                    a.geometry.kind === "legacy-screen"
                      ? `M${a.geometry.points[0][0] + 24} ${a.geometry.points[0][1] - 17}V${a.geometry.points[0][1] + 17}H${a.geometry.points[0][0] + 5}`
                      : curve(a.geometry.points)
                  }
                  fill="none"
                  stroke="transparent"
                  strokeWidth="22"
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="stroke"
                />
              ))}
            {selectedAction?.geometry.points.map((p, i) => (
              <circle
                key={i}
                data-handle={i}
                cx={p[0]}
                cy={p[1]}
                r={radius}
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
          Annuler le tracé ({pending.length})
        </button>
      )}
    </div>
  );
}
