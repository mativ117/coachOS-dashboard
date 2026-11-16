/** Fond historique conservé ; une seule définition pour les deux paniers. */
export function CourtEnd() {
  return (
    <g data-court-end="">
      <g fill="none" className="historical-lines" strokeWidth="3">
        <rect x="277" y="42" width="196" height="232" className="court-key" />
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
  );
}
