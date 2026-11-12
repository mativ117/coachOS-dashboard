import { useId } from "react";

export type CourtKind = "half" | "full";

/** Coordonnées en centimètres : largeur 15 m, longueur 28 m. */
export function Court({
  kind = "half",
  players = false,
  miniature = false,
}: {
  kind?: CourtKind;
  players?: boolean;
  miniature?: boolean;
}) {
  const id = useId();
  const full = kind === "full";
  const height = full ? 2800 : 1400;
  const end = (
    <g fill="none" stroke="currentColor" strokeWidth="9">
      <rect x="505" y="0" width="490" height="580" className="court-key" />
      <path d="M570 580 A180 180 0 0 0 930 580" />
      <path d="M570 580 A180 180 0 0 1 930 580" strokeDasharray="22 22" />
      <path d="M90 0 V299 A675 675 0 0 0 1410 299 V0" />
      <path d="M625 157.5 A125 125 0 0 0 875 157.5" />
      <path d="M660 120 H840" strokeWidth="12" />
      <circle cx="750" cy="157.5" r="22.5" className="court-rim" />
    </g>
  );
  return (
    <svg
      className={`court-svg ${miniature ? "court-miniature" : ""}`}
      viewBox={`-35 -35 1570 ${height + 70}`}
      role="img"
      aria-labelledby={miniature ? undefined : id}
      aria-hidden={miniature ? true : undefined}
    >
      {!miniature && (
        <title id={id}>
          {full ? "Terrain entier" : "Demi-terrain"} de basket — aperçu de
          démonstration{players ? ", cinq joueurs numérotés" : ""}
        </title>
      )}
      <rect
        x="-35"
        y="-35"
        width="1570"
        height={height + 70}
        rx="28"
        className="court-surround"
      />
      <rect width="1500" height={height} className="court-floor" />
      <g className="court-lines">
        {end}
        {full && <g transform="translate(1500 2800) rotate(180)">{end}</g>}
        <rect
          width="1500"
          height={height}
          fill="none"
          stroke="currentColor"
          strokeWidth="9"
        />
        {full ? (
          <>
            <path
              d="M0 1400 H1500"
              fill="none"
              stroke="currentColor"
              strokeWidth="9"
            />
            <circle
              cx="750"
              cy="1400"
              r="180"
              fill="none"
              stroke="currentColor"
              strokeWidth="9"
            />
          </>
        ) : (
          <path
            d="M570 1400 A180 180 0 0 1 930 1400"
            fill="none"
            stroke="currentColor"
            strokeWidth="9"
          />
        )}
      </g>
      <text x="750" y="1100" textAnchor="middle" className="court-wordmark">
        COACHOS
      </text>
      {players &&
        [
          [750, 1000],
          [210, 400],
          [1290, 400],
          [505, 580],
          [995, 580],
        ].map(([x, y], i) => (
          <g
            key={i}
            transform={`translate(${x} ${y})`}
            className="court-player"
          >
            <circle r="49" />
            <text textAnchor="middle" dy=".35em">
              {i + 1}
            </text>
          </g>
        ))}
    </svg>
  );
}
