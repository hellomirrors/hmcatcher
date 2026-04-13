import type {
  DialogDefinition,
  DialogStep,
  ScoreBucket,
} from "@/domain/dialog/dialog-schema";
import { resolveBucket } from "@/domain/dialog/score-buckets";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DialogPath {
  bucket: ScoreBucket | undefined;
  /** Score added at each corresponding choice point. */
  choiceScores: number[];
  /** Human-readable label at each choice point. */
  choices: string[];
  score: number;
}

export interface PathSummary {
  branch: string;
  maxBucket: ScoreBucket | undefined;
  maxScore: number;
  minBucket: ScoreBucket | undefined;
  minScore: number;
  pathCount: number;
}

export interface ScoreTreeNode {
  children: ScoreTreeNode[];
  isLeaf: boolean;
  label: string;
  maxBucket: ScoreBucket | undefined;
  maxTotal: number;
  minBucket: ScoreBucket | undefined;
  minTotal: number;
  pathCount: number;
  scoreAdded: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function resolveTransitionForOption(
  step: DialogStep,
  optionId: string
): string | undefined {
  for (const t of step.transitions) {
    if (t.conditions && t.conditions.length > 0) {
      const matches = t.conditions.every(
        (c) => c.operator === "eq" && optionId === String(c.value)
      );
      if (matches) {
        return t.targetStepId;
      }
    }
  }
  const fallback = step.transitions.find(
    (t) => !t.conditions || t.conditions.length === 0
  );
  return fallback?.targetStepId ?? step.transitions.at(-1)?.targetStepId;
}

interface WalkContext {
  buckets: ScoreBucket[] | undefined;
  paths: DialogPath[];
  stepMap: Map<string, DialogStep>;
}

function emitPath(
  ctx: WalkContext,
  choices: string[],
  choiceScores: number[],
  score: number
): void {
  ctx.paths.push({
    choices: [...choices],
    choiceScores: [...choiceScores],
    score,
    bucket: resolveBucket(score, ctx.buckets),
  });
}

function walkChoiceStep(
  step: DialogStep,
  score: number,
  choices: string[],
  choiceScores: number[],
  visited: Set<string>,
  ctx: WalkContext
): void {
  for (const option of step.options ?? []) {
    const added = option.score ?? 0;
    const nextStepId = resolveTransitionForOption(step, option.id);

    if (nextStepId) {
      walk(
        nextStepId,
        score + added,
        [...choices, option.label],
        [...choiceScores, added],
        new Set(visited),
        ctx
      );
    } else {
      emitPath(
        ctx,
        [...choices, option.label],
        [...choiceScores, added],
        score + added
      );
    }
  }
}

function walk(
  stepId: string,
  score: number,
  choices: string[],
  choiceScores: number[],
  visited: Set<string>,
  ctx: WalkContext
): void {
  if (visited.has(stepId)) {
    emitPath(ctx, choices, choiceScores, score);
    return;
  }

  const step = ctx.stepMap.get(stepId);
  if (!step) {
    emitPath(ctx, choices, choiceScores, score);
    return;
  }

  visited.add(stepId);

  const isChoice =
    (step.type === "buttons" || step.type === "list") &&
    step.options &&
    step.options.length > 0;

  if (isChoice) {
    walkChoiceStep(step, score, choices, choiceScores, visited, ctx);
  } else {
    const nextStepId = step.transitions[0]?.targetStepId;
    if (nextStepId) {
      walk(nextStepId, score, choices, choiceScores, visited, ctx);
    } else {
      emitPath(ctx, choices, choiceScores, score);
    }
  }
}

// ---------------------------------------------------------------------------
// Public: enumerate all paths
// ---------------------------------------------------------------------------

export function enumeratePaths(definition: DialogDefinition): DialogPath[] {
  const stepMap = new Map<string, DialogStep>();
  for (const step of definition.steps) {
    stepMap.set(step.id, step);
  }

  const firstStep = definition.steps[0];
  if (!firstStep) {
    return [];
  }

  const ctx: WalkContext = {
    paths: [],
    stepMap,
    buckets: definition.scoreBuckets,
  };

  walk(firstStep.id, 0, [], [], new Set(), ctx);
  return ctx.paths;
}

// ---------------------------------------------------------------------------
// Public: summarize by first branch
// ---------------------------------------------------------------------------

export function summarizePaths(
  paths: DialogPath[],
  buckets: ScoreBucket[] | undefined
): PathSummary[] {
  const groups = new Map<string, DialogPath[]>();

  for (const path of paths) {
    const branch = path.choices[0] ?? "(leer)";
    const group = groups.get(branch) ?? [];
    group.push(path);
    groups.set(branch, group);
  }

  const summaries: PathSummary[] = [];
  for (const [branch, group] of groups) {
    const scores = group.map((p) => p.score);
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    summaries.push({
      branch,
      minScore,
      maxScore,
      pathCount: group.length,
      minBucket: resolveBucket(minScore, buckets),
      maxBucket: resolveBucket(maxScore, buckets),
    });
  }

  return summaries;
}

// ---------------------------------------------------------------------------
// Public: build score tree
// ---------------------------------------------------------------------------

export function buildScoreTree(
  paths: DialogPath[],
  buckets: ScoreBucket[] | undefined
): ScoreTreeNode {
  const root = createTreeNode("Start", 0, paths, buckets);
  addChildren(root, paths, 0, buckets);
  return root;
}

function createTreeNode(
  label: string,
  scoreAdded: number,
  paths: DialogPath[],
  buckets: ScoreBucket[] | undefined
): ScoreTreeNode {
  const scores = paths.map((p) => p.score);
  const minTotal = scores.length > 0 ? Math.min(...scores) : 0;
  const maxTotal = scores.length > 0 ? Math.max(...scores) : 0;
  return {
    label,
    scoreAdded,
    minTotal,
    maxTotal,
    minBucket: resolveBucket(minTotal, buckets),
    maxBucket: resolveBucket(maxTotal, buckets),
    pathCount: paths.length,
    isLeaf: false,
    children: [],
  };
}

function addChildren(
  parent: ScoreTreeNode,
  paths: DialogPath[],
  depth: number,
  buckets: ScoreBucket[] | undefined
): void {
  // Group paths by their choice at this depth
  const groups = new Map<string, DialogPath[]>();
  for (const path of paths) {
    if (depth >= path.choices.length) {
      continue;
    }
    const key = path.choices[depth];
    const group = groups.get(key) ?? [];
    group.push(path);
    groups.set(key, group);
  }

  if (groups.size === 0) {
    parent.isLeaf = true;
    return;
  }

  for (const [label, group] of groups) {
    // scoreAdded is the same for all paths in this group at this depth
    const added = group[0].choiceScores[depth] ?? 0;
    const allDone = group.every((p) => p.choices.length <= depth + 1);
    const node = createTreeNode(label, added, group, buckets);
    node.isLeaf = allDone;

    if (!allDone) {
      addChildren(node, group, depth + 1, buckets);
    }

    parent.children.push(node);
  }

  parent.children.sort((a, b) => b.maxTotal - a.maxTotal);
}
