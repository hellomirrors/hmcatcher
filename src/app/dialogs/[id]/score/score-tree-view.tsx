"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { ScoreBucket } from "@/domain/dialog/dialog-schema";
import { bucketColorClass } from "@/domain/dialog/score-buckets";
import type { ScoreTreeNode } from "./path-calculator";

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function BucketBadge({ bucket }: { bucket: ScoreBucket | undefined }) {
  if (!bucket) {
    return null;
  }
  return (
    <span
      className={`rounded px-1.5 py-0.5 font-medium text-[0.6rem] ${bucketColorClass(bucket.id)}`}
    >
      {bucket.label}
    </span>
  );
}

function ScoreRange({ node }: { node: ScoreTreeNode }) {
  if (node.isLeaf && node.minTotal === node.maxTotal) {
    return (
      <span className="font-medium font-mono text-xs">{node.minTotal}</span>
    );
  }
  return (
    <span className="font-mono text-xs">
      {node.minTotal}–{node.maxTotal}
    </span>
  );
}

function BucketRange({ node }: { node: ScoreTreeNode }) {
  if (node.minBucket?.id === node.maxBucket?.id) {
    return <BucketBadge bucket={node.minBucket} />;
  }
  return (
    <span className="flex items-center gap-1">
      <BucketBadge bucket={node.minBucket} />
      <span className="text-[0.55rem] text-muted-foreground">–</span>
      <BucketBadge bucket={node.maxBucket} />
    </span>
  );
}

function ScoreAdded({ value }: { value: number }) {
  if (value === 0) {
    return null;
  }
  return (
    <span className="rounded bg-primary/10 px-1 py-0.5 font-mono text-[0.6rem] text-primary">
      +{value}
    </span>
  );
}

function PathCount({ count }: { count: number }) {
  return (
    <span className="text-[0.6rem] text-muted-foreground">
      {count} {count === 1 ? "Pfad" : "Pfade"}
    </span>
  );
}

function ExpandIcon({
  expanded,
  hasChildren,
}: {
  expanded: boolean;
  hasChildren: boolean;
}) {
  if (!hasChildren) {
    return <span className="w-3.5 shrink-0" />;
  }
  if (expanded) {
    return <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />;
  }
  return <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />;
}

// ---------------------------------------------------------------------------
// Text tree (indented, like a file browser)
// ---------------------------------------------------------------------------

function TextTreeNode({
  node,
  depth,
  defaultExpanded,
}: {
  defaultExpanded: boolean;
  depth: number;
  node: ScoreTreeNode;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <button
        className="flex w-full items-center gap-2 rounded px-1 py-1 text-left text-sm transition-colors hover:bg-muted"
        onClick={() => hasChildren && setExpanded((e) => !e)}
        style={{ paddingLeft: `${depth * 20 + 4}px` }}
        type="button"
      >
        <ExpandIcon expanded={expanded} hasChildren={hasChildren} />
        <span className="flex-1 truncate font-medium">{node.label}</span>
        <ScoreAdded value={node.scoreAdded} />
        <ScoreRange node={node} />
        <BucketRange node={node} />
        <PathCount count={node.pathCount} />
      </button>

      {expanded &&
        node.children.map((child) => (
          <TextTreeNode
            defaultExpanded={depth < 1}
            depth={depth + 1}
            key={child.label}
            node={child}
          />
        ))}
    </div>
  );
}

export function TextTreeView({ root }: { root: ScoreTreeNode }) {
  return (
    <div className="grid gap-0.5">
      {root.children.map((child) => (
        <TextTreeNode
          defaultExpanded
          depth={0}
          key={child.label}
          node={child}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card tree (visual cards with connection lines)
// ---------------------------------------------------------------------------

function CardTreeNode({
  node,
  depth,
  defaultExpanded,
}: {
  defaultExpanded: boolean;
  depth: number;
  node: ScoreTreeNode;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const hasChildren = node.children.length > 0;

  return (
    <div className="flex gap-3">
      {/* Vertical connector line */}
      {depth > 0 && (
        <div className="flex w-4 shrink-0 flex-col items-center">
          <div className="h-3 w-px bg-border" />
          <div className="h-2 w-2 rounded-full border-2 border-primary bg-background" />
          {expanded && hasChildren && <div className="w-px flex-1 bg-border" />}
        </div>
      )}

      <div className="min-w-0 flex-1">
        {/* Node card */}
        <button
          className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
            hasChildren
              ? "cursor-pointer hover:border-primary/50 hover:bg-muted/50"
              : "cursor-default"
          } ${node.isLeaf ? "border-dashed" : ""}`}
          onClick={() => hasChildren && setExpanded((e) => !e)}
          type="button"
        >
          {hasChildren && <ExpandIcon expanded={expanded} hasChildren />}

          <span className="flex-1 truncate font-medium">{node.label}</span>

          <div className="flex shrink-0 items-center gap-2">
            <ScoreAdded value={node.scoreAdded} />
            <ScoreRange node={node} />
            <BucketRange node={node} />
            <PathCount count={node.pathCount} />
          </div>
        </button>

        {/* Children */}
        {expanded && hasChildren && (
          <div className="mt-1 grid gap-1 pl-1">
            {node.children.map((child) => (
              <CardTreeNode
                defaultExpanded={depth < 1}
                depth={depth + 1}
                key={child.label}
                node={child}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function CardTreeView({ root }: { root: ScoreTreeNode }) {
  return (
    <div className="grid gap-2">
      {root.children.map((child) => (
        <CardTreeNode
          defaultExpanded
          depth={0}
          key={child.label}
          node={child}
        />
      ))}
    </div>
  );
}
