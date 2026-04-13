import type { ScoreBucket } from "./dialog-schema";

/** Resolve which bucket a score falls into (highest minScore ≤ score). */
export function resolveBucket(
  score: number,
  buckets: ScoreBucket[] | undefined
): ScoreBucket | undefined {
  if (!buckets || buckets.length === 0) {
    return undefined;
  }
  // Sort descending by minScore, pick first match
  const sorted = [...buckets].sort((a, b) => b.minScore - a.minScore);
  return sorted.find((b) => score >= b.minScore);
}

/** Badge color class for a bucket (by id convention). */
export function bucketColorClass(bucketId: string): string {
  switch (bucketId) {
    case "high":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "medium":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
    case "low":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  }
}

export const DEFAULT_BUCKETS: ScoreBucket[] = [
  { id: "low", label: "Low", minScore: 0 },
  { id: "medium", label: "Medium", minScore: 51 },
  { id: "high", label: "High", minScore: 101 },
];
