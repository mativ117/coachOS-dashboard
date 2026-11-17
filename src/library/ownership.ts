import type { Library, Play } from "../model/types";
function signature(play: Play) {
  const {
    revision: _revision,
    createdAt: _created,
    updatedAt: _updated,
    ...content
  } = play;
  return JSON.stringify(content);
}
/** Only unchanged starter content becomes an example. Ambiguous or modified content stays personal. */
export function classifyLibrary(library: Library, starters: Play[]): Library {
  if (library.librarySchemaVersion === 3) return library;
  return {
    ...library,
    librarySchemaVersion: 3,
    examplePlayIds: library.plays
      .filter((p) =>
        starters.some((s) => s.id === p.id && signature(s) === signature(p)),
      )
      .map((p) => p.id),
  };
}
