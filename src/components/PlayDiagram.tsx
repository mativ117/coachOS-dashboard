import { useId } from "react";
import type { Play, Point, Step } from "../model/types";

/** Même interpolation Catmull-Rom → Bézier que le lecteur historique. */
export function curve(points: Point[]): string {
  let d = `M${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[Math.max(0, i - 1)],
      b = points[i],
      c = points[i + 1],
      z = points[Math.min(i + 2, points.length - 1)];
    d += ` C${b[0] + (c[0] - a[0]) / 6} ${b[1] + (c[1] - a[1]) / 6} ${c[0] - (z[0] - b[0]) / 6} ${c[1] - (z[1] - b[1]) / 6} ${c[0]} ${c[1]}`;
  }
  return d;
}
function bounds(play: Play): string {
  // Cadrage de l'ensemble des coordonnées brutes ; aucune mise à l'échelle tactique.
  const points = play.commonSteps.flatMap((s) => [
    ...Object.values(s.afterState.players),
    ...s.actions.flatMap((a) => a.geometry.points),
  ]);
  const xs = points.map((p) => p[0]),
    ys = points.map((p) => p[1]);
  const x = Math.min(...xs) - 24,
    y = Math.min(...ys) - 24;
  return `${x} ${y} ${Math.max(...xs) - x + 24} ${Math.max(...ys) - y + 24}`;
}
export function PlayDiagram({
  play,
  step,
  miniature = false,
}: {
  play: Play;
  step: Step;
  miniature?: boolean;
}) {
  const id = useId();
  const raw = play.court.coordinateSpace === "stack-raw";
  const state = step.afterState;
  const screens = step.actions.filter(
    (a) => a.geometry.kind === "legacy-screen",
  );
  const paths = step.actions.filter((a) => a.geometry.kind !== "legacy-screen");
  return (
    <svg
      className={`court-svg play-diagram ${raw ? "raw-diagram" : ""}`}
      viewBox={raw ? bounds(play) : "0 0 750 655"}
      role="img"
      aria-hidden={miniature ? true : undefined}
      aria-labelledby={miniature ? undefined : `${id}-title`}
    >
      {!miniature && (
        <title id={`${id}-title`}>
          {play.name} — {step.title}
          {raw ? " — coordonnées source, dimensions non confirmées" : ""}
        </title>
      )}
      <defs>
        {["run", "cut", "pass"].map((kind) => (
          <marker
            key={kind}
            id={`${id}-${kind}`}
            markerWidth="7"
            markerHeight="7"
            refX="6"
            refY="3.5"
            orient="auto"
          >
            <path d="M0 0L7 3.5L0 7Z" className={`action-${kind}`} />
          </marker>
        ))}
      </defs>
      {!raw && (
        <g className="historical-court">
          <rect width="750" height="655" className="court-surround" />
          <rect
            x="75"
            y="42"
            width="600"
            height="560"
            className="court-floor"
          />
          <g fill="none" className="historical-lines" strokeWidth="3">
            <rect x="75" y="42" width="600" height="560" />
            <rect
              x="277"
              y="42"
              width="196"
              height="232"
              className="court-key"
            />
            <path d="M277 274A98 98 0 0 0 473 274" />
            <path d="M277 274A98 98 0 0 1 473 274" strokeDasharray="9 9" />
            <path d="M311 105A64 64 0 0 0 439 105" />
            <path d="M111 42V169A270 270 0 0 0 639 169V42" />
            <path d="M326 67H424" strokeWidth="6" />
          </g>
          <circle
            cx="375"
            cy="105"
            r="9"
            fill="none"
            stroke="#b87934"
            strokeWidth="3"
          />
        </g>
      )}
      <g data-layer="paths">
        {paths.map((a) => {
          const points = a.geometry.points;
          const [endX, endY] = points.at(-1)!;
          const prior = points.at(-2)!;
          const length = Math.hypot(endX - prior[0], endY - prior[1]);
          const dx = length ? (-(endY - prior[1]) / length) * 7 : 7;
          const dy = length ? ((endX - prior[0]) / length) * 7 : 0;
          return (
            <g key={a.id} data-action-id={a.id}>
              <path
                d={
                  a.geometry.kind === "catmull-rom"
                    ? curve(points)
                    : play.metadata.report.source === "historical"
                      ? curve(points)
                      : `M${points[0][0]} ${points[0][1]}L${endX} ${endY}`
                }
                className={`action-${a.kind}`}
                fill="none"
                strokeWidth={raw ? 2.3 : 4.3}
                strokeDasharray={
                  a.kind === "pass" ? (raw ? "5 4" : "9 8") : undefined
                }
                strokeLinecap="round"
                markerEnd={
                  a.kind === "screen" ? undefined : `url(#${id}-${a.kind})`
                }
              />
              {a.kind === "screen" && (
                <path
                  d={`M${endX - dx} ${endY - dy}L${endX + dx} ${endY + dy}`}
                  className="action-screen"
                  strokeWidth="2.3"
                />
              )}
            </g>
          );
        })}
      </g>
      <g data-layer="screens">
        {screens.map((a) => {
          const [x, y] = a.geometry.points[0];
          return (
            <path
              key={a.id}
              d={`M${x + 24} ${y - 17}V${y + 17}H${x + 5}`}
              className="action-screen"
              strokeWidth="4"
              fill="none"
            />
          );
        })}
      </g>
      <g data-layer="players">
        {Object.entries(state.players).map(([player, position]) => (
          <g
            key={player}
            className="play-player"
            data-player={player}
            transform={`translate(${position[0]} ${position[1]})`}
          >
            <circle r={raw ? 10 : 21} strokeWidth={raw ? 1.5 : 3} />
            <text
              y={raw ? 0 : 1}
              style={{ fontSize: raw ? 10 : 20 }}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {player}
            </text>
          </g>
        ))}
      </g>
      <g data-layer="ball">
        {state.ball && (
          <circle
            cx={
              state.ball.mode === "attached"
                ? state.players[state.ball.carrierId][0] + (raw ? 11 : 22)
                : state.ball.position[0]
            }
            cy={
              state.ball.mode === "attached"
                ? state.players[state.ball.carrierId][1] + (raw ? 7 : 14)
                : state.ball.position[1]
            }
            r={raw ? 4 : 8}
            className="play-ball"
            strokeWidth={raw ? 1 : 2}
          />
        )}
      </g>
    </svg>
  );
}
