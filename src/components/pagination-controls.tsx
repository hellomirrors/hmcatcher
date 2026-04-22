import Link from "next/link";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

interface SearchParamsLike {
  [key: string]: string | undefined;
}

interface PaginationControlsProps {
  basePath: string;
  currentPage: number;
  pageSize: number;
  /** Preserves existing filter params (page is injected by this component). */
  searchParams: SearchParamsLike;
  totalItems: number;
}

function buildHref(
  basePath: string,
  params: SearchParamsLike,
  page: number
): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "page") {
      continue;
    }
    if (value && value !== "all") {
      qs.set(key, value);
    }
  }
  if (page > 1) {
    qs.set("page", String(page));
  }
  const suffix = qs.toString();
  return suffix ? `${basePath}?${suffix}` : basePath;
}

export function PaginationControls({
  basePath,
  currentPage,
  pageSize,
  searchParams,
  totalItems,
}: PaginationControlsProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const clampedPage = Math.min(Math.max(1, currentPage), totalPages);
  const first = totalItems === 0 ? 0 : (clampedPage - 1) * pageSize + 1;
  const last = Math.min(clampedPage * pageSize, totalItems);
  const prevDisabled = clampedPage <= 1;
  const nextDisabled = clampedPage >= totalPages;

  const prevHref = prevDisabled
    ? undefined
    : buildHref(basePath, searchParams, clampedPage - 1);
  const nextHref = nextDisabled
    ? undefined
    : buildHref(basePath, searchParams, clampedPage + 1);

  return (
    <nav
      aria-label="Seitennavigation"
      className="flex flex-wrap items-center justify-between gap-3 pt-4 text-sm"
    >
      <p className="text-muted-foreground">
        {totalItems === 0
          ? "Keine Einträge"
          : `${first} – ${last} von ${totalItems}`}
      </p>
      <div className="flex items-center gap-2">
        {prevHref ? (
          <Link
            className={buttonVariants({ variant: "outline", size: "sm" })}
            href={prevHref}
            rel="prev"
          >
            Zurück
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "pointer-events-none opacity-50"
            )}
          >
            Zurück
          </span>
        )}
        <span className="text-muted-foreground text-xs tabular-nums">
          Seite {clampedPage} / {totalPages}
        </span>
        {nextHref ? (
          <Link
            className={buttonVariants({ variant: "outline", size: "sm" })}
            href={nextHref}
            rel="next"
          >
            Weiter
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "pointer-events-none opacity-50"
            )}
          >
            Weiter
          </span>
        )}
      </div>
    </nav>
  );
}

interface ParsePageInput {
  defaultPageSize?: number;
  pageSize?: string;
  value: string | undefined;
}

export function parsePage({
  value,
  pageSize,
  defaultPageSize = 25,
}: ParsePageInput): { page: number; pageSize: number } {
  const parsedSize = pageSize ? Number(pageSize) : defaultPageSize;
  const size =
    Number.isFinite(parsedSize) && parsedSize > 0
      ? Math.min(parsedSize, 200)
      : defaultPageSize;
  const parsedPage = value ? Number(value) : 1;
  const page =
    Number.isFinite(parsedPage) && parsedPage >= 1 ? Math.floor(parsedPage) : 1;
  return { page, pageSize: size };
}
