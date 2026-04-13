import type {
  DialogDefinition,
  DialogStep,
  ScoreBucket,
} from "@/domain/dialog/dialog-schema";
import { resolveBucket } from "@/domain/dialog/score-buckets";

/** A single fully-resolved path through the dialog with its total score. */
export interface DialogPath {
  bucket: ScoreBucket | undefined;
  choices: string[];
  score: number;
}

/** Summary per main branch (first choice step). */
export interface PathSummary {
  branch: string;
  maxBucket: ScoreBucket | undefined;
  maxScore: number;
  minBucket: ScoreBucket | undefined;
  minScore: number;
  pathCount: number;
}

/** Resolve which transition a given option triggers. */
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

function emitPath(
  paths: DialogPath[],
  choices: string[],
  score: number,
  buckets: ScoreBucket[] | undefined
): void {
  paths.push({
    choices: [...choices],
    score,
    bucket: resolveBucket(score, buckets),
  });
}

function walkChoiceStep(
  step: DialogStep,
  score: number,
  choices: string[],
  visited: Set<string>,
  ctx: WalkContext
): void {
  for (const option of step.options ?? []) {
    const newScore = score + (option.score ?? 0);
    const newChoices = [...choices, option.label];
    const nextStepId = resolveTransitionForOption(step, option.id);

    if (nextStepId) {
      walk(nextStepId, newScore, newChoices, new Set(visited), ctx);
    } else {
      emitPath(ctx.paths, newChoices, newScore, ctx.buckets);
    }
  }
}

interface WalkContext {
  buckets: ScoreBucket[] | undefined;
  paths: DialogPath[];
  stepMap: Map<string, DialogStep>;
}

function walk(
  stepId: string,
  score: number,
  choices: string[],
  visited: Set<string>,
  ctx: WalkContext
): void {
  if (visited.has(stepId)) {
    emitPath(ctx.paths, choices, score, ctx.buckets);
    return;
  }

  const step = ctx.stepMap.get(stepId);
  if (!step) {
    emitPath(ctx.paths, choices, score, ctx.buckets);
    return;
  }

  visited.add(stepId);

  const isChoice =
    (step.type === "buttons" || step.type === "list") &&
    step.options &&
    step.options.length > 0;

  if (isChoice) {
    walkChoiceStep(step, score, choices, visited, ctx);
  } else {
    const nextStepId = step.transitions[0]?.targetStepId;
    if (nextStepId) {
      walk(nextStepId, score, choices, visited, ctx);
    } else {
      emitPath(ctx.paths, choices, score, ctx.buckets);
    }
  }
}

/**
 * Enumerate every possible path through a dialog and compute the total
 * score for each.
 */
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

  walk(firstStep.id, 0, [], new Set(), ctx);
  return ctx.paths;
}

/** Group all enumerated paths into summaries per first choice. */
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
