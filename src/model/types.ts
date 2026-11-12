export type Point = [number, number];
export type BallState =
  | { mode: "attached"; carrierId: string }
  | { mode: "free"; position: Point }
  | null;
export interface State {
  players: Record<string, Point>;
  ball: BallState;
}
export interface Action {
  id: string;
  kind: "run" | "cut" | "pass" | "screen";
  actorId?: string;
  recipientId?: string;
  geometry: { kind: "line" | "catmull-rom" | "legacy-screen"; points: Point[] };
  status: "recorded" | "optional" | "unassigned";
}
export interface Step {
  id: string;
  title: string;
  note: string;
  beforeState: State;
  afterState: State;
  actions: Action[];
  flags: string[];
}
export interface Branch {
  id: string;
  name: string;
  forkStepId: string;
  steps: Step[];
}
export interface MigrationReport {
  source: "historical" | "stack" | "draft";
  steps: number;
  branches: number;
  actions: number;
  issues: string[];
}
export interface Play {
  id: string;
  schemaVersion: 1;
  revision: number;
  createdAt: string;
  updatedAt: string;
  name: string;
  status: "imported" | "needs-review" | "draft";
  court: {
    kind: "half" | "full";
    coordinateSpace: "legacy-750x655" | "stack-raw";
    dimensionsConfirmed: boolean;
  };
  initialState: State;
  commonSteps: Step[];
  branches: Branch[];
  metadata: {
    description: string;
    guidance: string;
    category: string;
    report: MigrationReport;
  };
}
export interface Library {
  librarySchemaVersion: 1;
  revision: number;
  plays: Play[];
  collections: { id: string; name: string; playIds: string[] }[];
  preferences: { courtPreview: "half" | "full" };
}
export function sequence(play: Play, branchId?: string): Step[] {
  const branch =
    play.branches.find((b) => b.id === branchId) ?? play.branches[0];
  if (!branch) return play.commonSteps;
  const fork = play.commonSteps.findIndex((s) => s.id === branch.forkStepId);
  return [...play.commonSteps.slice(0, fork + 1), ...branch.steps];
}
