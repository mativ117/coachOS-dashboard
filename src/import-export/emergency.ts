import type { Library } from "../model/types";
/** Export de secours JSON en attendant le format d'échange et la restauration de phase 5. */
export function downloadEmergency(library: Library) {
  const blob = new Blob([JSON.stringify(library, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "coachos-secours.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
