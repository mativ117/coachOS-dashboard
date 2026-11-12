import { useEffect, useState } from "react";
/** Garder la saisie locale permet de taper une virgule ou un point sans réécriture intermédiaire. */
export function TimingInput({
  label,
  value,
  min,
  max,
  integer = false,
  placeholder,
  onCommit,
}: {
  label: string;
  value: number | undefined;
  min: number;
  max: number;
  integer?: boolean;
  placeholder?: string;
  onCommit: (value: number | undefined) => void;
}) {
  const format = (n: number | undefined) =>
    n === undefined ? "" : String(n).replace(".", ",");
  const [draft, setDraft] = useState(() => format(value));
  const [error, setError] = useState("");
  useEffect(() => {
    setDraft(format(value));
    setError("");
  }, [value]);
  function commit() {
    if (!draft.trim()) {
      if (value !== undefined) onCommit(undefined);
      setError("");
      return;
    }
    const n = Number(draft.replace(",", "."));
    if (
      !Number.isFinite(n) ||
      n < min ||
      n > max ||
      !(integer ? /^\d+$/ : /^\d+(?:[.,]\d{0,3})?$/).test(draft.trim())
    ) {
      setError(
        `Valeur attendue entre ${format(min)} et ${format(max)}${integer ? ", entière" : ""}.`,
      );
      return;
    }
    setError("");
    setDraft(format(n));
    if (n !== value) onCommit(n);
  }
  return (
    <>
      <input
        aria-label={label}
        type="text"
        inputMode={integer ? "numeric" : "decimal"}
        value={draft}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        onChange={(e) => {
          setDraft(e.target.value);
          setError("");
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
      />
      {error && (
        <span className="timing-input-error" role="alert">
          {error}
        </span>
      )}
    </>
  );
}
