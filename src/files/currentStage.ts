import { t } from "../i18n";
import type { Play, Step } from "../model/types";
import type { ExportStage } from "./graphics";
export function currentStage(play: Play, step?: Step): ExportStage | undefined {
  if (!step) return undefined;
  const common = play.commonSteps.findIndex((s) => s.id === step.id);
  if (common >= 0)
    return {
      play,
      step,
      label: t("Tronc commun · Étape {0}", common + 1),
      first: common === 0,
    };
  const branch = play.branches.find((b) =>
    b.steps.some((s) => s.id === step.id),
  );
  if (!branch) return undefined;
  return {
    play,
    step,
    label: t(
      "Lecture « {0} » · Étape {1}",
      branch.name,
      branch.steps.findIndex((s) => s.id === step.id) + 1,
    ),
    first: false,
  };
}
