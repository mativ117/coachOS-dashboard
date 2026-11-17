import { sequence, type Play } from "../model/types";
export interface ResumeEntry {
  playId: string;
  stepId: string;
  branchId: string;
  openedAt: number;
}
const key = "coachos.library.resume.v1";
export function readResumes(): ResumeEntry[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    if (!Array.isArray(value)) return [];
    return value
      .filter(
        (e): e is ResumeEntry =>
          !!e &&
          typeof e === "object" &&
          ["playId", "stepId", "branchId"].every(
            (k) => typeof e[k] === "string" && e[k].length <= 200,
          ) &&
          Number.isFinite(e.openedAt) &&
          e.openedAt >= 0,
      )
      .slice(0, 100);
  } catch {
    return [];
  }
}
export function rememberStep(playId: string, stepId: string, branchId: string) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify(
        [
          { playId, stepId, branchId, openedAt: Date.now() },
          ...readResumes().filter((e) => e.playId !== playId),
        ].slice(0, 100),
      ),
    );
  } catch {
    /* Editing works without preference storage. */
  }
}
export function continuation(play: Play, entries = readResumes()) {
  const saved = entries.find((e) => e.playId === play.id);
  if (!saved) return undefined;
  if (
    saved.branchId !== "common" &&
    !play.branches.some((b) => b.id === saved.branchId)
  )
    return undefined;
  const steps = sequence(play, saved.branchId),
    step = steps.find((s) => s.id === saved.stepId);
  if (!step) return undefined;
  return {
    ...saved,
    step,
    index: steps.indexOf(step),
    branch: play.branches.find((b) => b.id === saved.branchId),
  };
}
export function editorHref(play: Play) {
  const query = new URLSearchParams({ play: play.id }),
    saved = continuation(play);
  if (saved) {
    query.set("step", saved.stepId);
    query.set("branch", saved.branchId);
  }
  return `#/editor?${query}`;
}
