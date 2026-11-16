import { AnimationPlayer } from "../animation/AnimationPlayer";
import type { Library, Play } from "../model/types";
export function PlayViewer({
  play,
  library,
}: {
  play: Play;
  library: Library;
}) {
  return <AnimationPlayer play={play} library={library} />;
}
