"use client";

import { ArrowDown, ArrowUp, List, Plus, Rows3, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  DialogDefinition,
  ScoreBucket,
} from "@/domain/dialog/dialog-schema";
import { bucketColorClass } from "@/domain/dialog/score-buckets";
import {
  type DialogPath,
  enumeratePaths,
  type PathSummary,
  summarizePaths,
} from "./path-calculator";

interface DialogScoreTabProps {
  definition: DialogDefinition;
  onUpdateBuckets: (buckets: ScoreBucket[]) => void;
}

type SortDir = "asc" | "desc";

function BucketBadge({ bucket }: { bucket: ScoreBucket | undefined }) {
  if (!bucket) {
    return null;
  }
  return (
    <span
      className={`rounded px-1.5 py-0.5 font-medium text-[0.65rem] ${bucketColorClass(bucket.id)}`}
    >
      {bucket.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Summary view
// ---------------------------------------------------------------------------

function SummaryView({
  summaries,
  sortDir,
  onToggleSort,
}: {
  onToggleSort: () => void;
  sortDir: SortDir;
  summaries: PathSummary[];
}) {
  const sorted = useMemo(() => {
    const copy = [...summaries];
    copy.sort((a, b) =>
      sortDir === "asc" ? a.maxScore - b.maxScore : b.maxScore - a.maxScore
    );
    return copy;
  }, [summaries, sortDir]);

  return (
    <div className="grid gap-1">
      {/* Header */}
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 border-b px-3 py-1.5 font-medium text-muted-foreground text-xs">
        <span>Pfad</span>
        <span className="w-16 text-right">Pfade</span>
        <button
          className="flex w-24 items-center justify-end gap-1 transition-colors hover:text-foreground"
          onClick={onToggleSort}
          type="button"
        >
          Score
          {sortDir === "asc" ? (
            <ArrowUp className="size-3" />
          ) : (
            <ArrowDown className="size-3" />
          )}
        </button>
        <span className="w-20 text-right">Bucket</span>
      </div>

      {sorted.map((s) => (
        <div
          className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted"
          key={s.branch}
        >
          <span className="truncate font-medium">{s.branch}</span>
          <span className="w-16 text-right font-mono text-muted-foreground text-xs">
            {s.pathCount}
          </span>
          <span className="w-24 text-right font-mono text-xs">
            {s.minScore}–{s.maxScore}
          </span>
          <div className="flex w-20 justify-end gap-1">
            <BucketBadge bucket={s.minBucket} />
            {s.minBucket?.id !== s.maxBucket?.id && (
              <>
                <span className="text-muted-foreground text-xs">–</span>
                <BucketBadge bucket={s.maxBucket} />
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail view
// ---------------------------------------------------------------------------

function DetailView({
  paths,
  sortDir,
  onToggleSort,
}: {
  onToggleSort: () => void;
  paths: DialogPath[];
  sortDir: SortDir;
}) {
  const sorted = useMemo(() => {
    const copy = [...paths];
    copy.sort((a, b) =>
      sortDir === "asc" ? a.score - b.score : b.score - a.score
    );
    return copy;
  }, [paths, sortDir]);

  return (
    <div className="grid gap-1">
      {/* Header */}
      <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b px-3 py-1.5 font-medium text-muted-foreground text-xs">
        <span>Pfad (Auswahl-Kombination)</span>
        <button
          className="flex w-16 items-center justify-end gap-1 transition-colors hover:text-foreground"
          onClick={onToggleSort}
          type="button"
        >
          Score
          {sortDir === "asc" ? (
            <ArrowUp className="size-3" />
          ) : (
            <ArrowDown className="size-3" />
          )}
        </button>
        <span className="w-20 text-right">Bucket</span>
      </div>

      <div className="max-h-[500px] overflow-y-auto">
        {sorted.map((p, i) => (
          <div
            className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-md px-3 py-1.5 text-xs hover:bg-muted"
            key={`${p.choices.join("-")}-${i}`}
          >
            <span className="truncate text-muted-foreground">
              {p.choices.join(" → ")}
            </span>
            <span className="w-16 text-right font-medium font-mono">
              {p.score}
            </span>
            <div className="flex w-20 justify-end">
              <BucketBadge bucket={p.bucket} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bucket editor
// ---------------------------------------------------------------------------

function BucketEditor({
  buckets,
  onChange,
}: {
  buckets: ScoreBucket[];
  onChange: (buckets: ScoreBucket[]) => void;
}) {
  const handleAdd = () => {
    const maxMin = Math.max(...buckets.map((b) => b.minScore), 0);
    onChange([
      ...buckets,
      {
        id: `bucket_${Date.now()}`,
        label: "Neu",
        minScore: maxMin + 50,
      },
    ]);
  };

  const handleRemove = (index: number) => {
    onChange(buckets.filter((_, i) => i !== index));
  };

  const handleUpdate = (index: number, patch: Partial<ScoreBucket>) => {
    onChange(buckets.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  };

  const sorted = [...buckets].sort((a, b) => a.minScore - b.minScore);

  return (
    <div className="grid gap-3">
      {sorted.map((bucket) => {
        const originalIndex = buckets.indexOf(bucket);
        return (
          <div
            className="flex items-end gap-2 rounded-md border p-2"
            key={bucket.id}
          >
            <div className="grid flex-1 gap-1">
              <Label className="text-xs">ID</Label>
              <Input
                className="h-8 text-xs"
                onChange={(e) =>
                  handleUpdate(originalIndex, { id: e.target.value })
                }
                value={bucket.id}
              />
            </div>
            <div className="grid flex-1 gap-1">
              <Label className="text-xs">Label</Label>
              <Input
                className="h-8 text-xs"
                onChange={(e) =>
                  handleUpdate(originalIndex, { label: e.target.value })
                }
                value={bucket.label}
              />
            </div>
            <div className="grid w-24 gap-1">
              <Label className="text-xs">Ab Score</Label>
              <Input
                className="h-8 text-xs"
                min={0}
                onChange={(e) =>
                  handleUpdate(originalIndex, {
                    minScore: Number(e.target.value) || 0,
                  })
                }
                type="number"
                value={bucket.minScore}
              />
            </div>
            <div className="flex items-center">
              <BucketBadge bucket={bucket} />
            </div>
            <Button
              onClick={() => handleRemove(originalIndex)}
              size="icon-xs"
              type="button"
              variant="ghost"
            >
              <Trash2 className="size-3 text-destructive" />
            </Button>
          </div>
        );
      })}
      <Button
        className="w-fit"
        onClick={handleAdd}
        size="sm"
        type="button"
        variant="outline"
      >
        <Plus className="mr-1 size-3.5" />
        Bucket hinzufügen
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DialogScoreTab({
  definition,
  onUpdateBuckets,
}: DialogScoreTabProps) {
  const [view, setView] = useState<"summary" | "detail">("summary");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const buckets = definition.scoreBuckets ?? [];

  const paths = useMemo(() => enumeratePaths(definition), [definition]);
  const summaries = useMemo(
    () => summarizePaths(paths, definition.scoreBuckets),
    [paths, definition.scoreBuckets]
  );

  const toggleSort = useCallback(() => {
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  }, []);

  const overallMin =
    paths.length > 0 ? Math.min(...paths.map((p) => p.score)) : 0;
  const overallMax =
    paths.length > 0 ? Math.max(...paths.map((p) => p.score)) : 0;

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6">
      {/* Overview stats */}
      <div className="flex gap-4">
        <Card className="flex-1">
          <CardContent className="flex items-center justify-between pt-4">
            <span className="text-muted-foreground text-sm">Pfade gesamt</span>
            <span className="font-bold text-2xl">{paths.length}</span>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardContent className="flex items-center justify-between pt-4">
            <span className="text-muted-foreground text-sm">Score-Range</span>
            <span className="font-bold text-2xl">
              {overallMin}–{overallMax}
            </span>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardContent className="flex items-center justify-between pt-4">
            <span className="text-muted-foreground text-sm">Buckets</span>
            <div className="flex gap-1">
              {buckets.map((b) => (
                <BucketBadge bucket={b} key={b.id} />
              ))}
              {buckets.length === 0 && (
                <span className="text-muted-foreground text-sm">—</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Path table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Score-Pfade</CardTitle>
            <div className="flex gap-1 rounded-lg bg-muted p-0.5">
              <Button
                className="h-7 px-2"
                onClick={() => setView("summary")}
                size="sm"
                variant={view === "summary" ? "secondary" : "ghost"}
              >
                <Rows3 className="mr-1 size-3.5" />
                Übersicht
              </Button>
              <Button
                className="h-7 px-2"
                onClick={() => setView("detail")}
                size="sm"
                variant={view === "detail" ? "secondary" : "ghost"}
              >
                <List className="mr-1 size-3.5" />
                Detail ({paths.length})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {view === "summary" ? (
            <SummaryView
              onToggleSort={toggleSort}
              sortDir={sortDir}
              summaries={summaries}
            />
          ) : (
            <DetailView
              onToggleSort={toggleSort}
              paths={paths}
              sortDir={sortDir}
            />
          )}
        </CardContent>
      </Card>

      {/* Bucket configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Score-Buckets</CardTitle>
        </CardHeader>
        <CardContent>
          <BucketEditor buckets={buckets} onChange={onUpdateBuckets} />
        </CardContent>
      </Card>
    </div>
  );
}
