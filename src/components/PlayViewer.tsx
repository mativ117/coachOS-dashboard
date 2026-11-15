import { AnimationPlayer } from "../animation/AnimationPlayer";
import type { Play } from "../model/types";
export function PlayViewer({ play }: { play: Play }) {
  return <AnimationPlayer play={play} />;
}
