import { classifyLibrary } from "../library/ownership";
import historical from "../../sources/index_original.html?raw";
import stack from "../../sources/stack_user_v2.json?raw";
import { migrateSources } from "./migrate";

export function seedLibrary() {
  const library = migrateSources(historical, stack);
  return classifyLibrary(library, library.plays);
}
