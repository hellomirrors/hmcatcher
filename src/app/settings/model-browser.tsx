"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  Info,
  Loader2,
  Search,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OpenRouterModel {
  context_length: number;
  created: number;
  description?: string;
  id: string;
  name: string;
  pricing: { prompt: string; completion: string };
}

type SortField =
  | "name"
  | "provider"
  | "inputPrice"
  | "outputPrice"
  | "context"
  | "date";
type SortDir = "asc" | "desc";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PROVIDER_COLORS: Record<string, string> = {
  anthropic:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  openai: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  google: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "meta-llama":
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  deepseek: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  mistralai: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

function getProvider(id: string): string {
  return id.split("/")[0] ?? "";
}

function providerBadgeClass(provider: string): string {
  return (
    PROVIDER_COLORS[provider] ??
    "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
  );
}

function formatPrice(pricePerToken: string): string {
  const perMillion = Number.parseFloat(pricePerToken) * 1_000_000;
  if (Number.isNaN(perMillion) || perMillion === 0) {
    return "Gratis";
  }
  if (perMillion < 0.01) {
    return `$${perMillion.toFixed(4)}`;
  }
  if (perMillion < 1) {
    return `$${perMillion.toFixed(2)}`;
  }
  return `$${perMillion.toFixed(1)}`;
}

function formatContext(length: number): string {
  if (length >= 1_000_000) {
    return `${(length / 1_000_000).toFixed(1)}M`;
  }
  if (length >= 1000) {
    return `${Math.round(length / 1000)}k`;
  }
  return String(length);
}

function formatDate(ts: number): string {
  if (!ts || ts <= 0) {
    return "—";
  }
  const d = new Date(ts * 1000);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

function SortIndicator({
  field,
  sortDir,
  sortField,
}: {
  field: SortField;
  sortDir: SortDir;
  sortField: SortField;
}) {
  if (sortField !== field) {
    return <ArrowUpDown className="h-3 w-3 opacity-40" />;
  }
  return sortDir === "asc" ? (
    <ArrowUp className="h-3 w-3" />
  ) : (
    <ArrowDown className="h-3 w-3" />
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ModelBrowserProps {
  currentModel: string;
  onOpenChange: (open: boolean) => void;
  onSelectModel: (modelId: string, displayName: string) => void;
  open: boolean;
}

export function ModelBrowser({
  open,
  onOpenChange,
  currentModel,
  onSelectModel,
}: ModelBrowserProps) {
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const { data, isLoading, error } = useQuery<{ models: OpenRouterModel[] }>({
    queryKey: ["openrouter-models"],
    queryFn: async () => {
      const res = await fetch("/api/models/openrouter");
      if (!res.ok) {
        throw new Error("Fehler beim Laden der Modelle");
      }
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
    enabled: open,
  });

  const models = useMemo(() => data?.models ?? [], [data]);

  const providers = useMemo(() => {
    const set = new Set(models.map((m) => getProvider(m.id)));
    return Array.from(set).sort();
  }, [models]);

  const handleSort = useCallback((field: SortField) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir("asc");
      return field;
    });
  }, []);

  const filtered = useMemo(() => {
    let result = models;

    if (providerFilter) {
      result = result.filter((m) => getProvider(m.id) === providerFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (m) =>
          m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "provider":
          cmp = getProvider(a.id).localeCompare(getProvider(b.id));
          break;
        case "inputPrice":
          cmp =
            Number.parseFloat(a.pricing.prompt) -
            Number.parseFloat(b.pricing.prompt);
          break;
        case "outputPrice":
          cmp =
            Number.parseFloat(a.pricing.completion) -
            Number.parseFloat(b.pricing.completion);
          break;
        case "context":
          cmp = a.context_length - b.context_length;
          break;
        case "date":
          cmp = (a.created || 0) - (b.created || 0);
          break;
        default:
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [models, providerFilter, search, sortField, sortDir]);

  const handleSelect = useCallback(
    (modelId: string, displayName: string) => {
      onSelectModel(modelId, displayName);
      onOpenChange(false);
    },
    [onSelectModel, onOpenChange]
  );

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-3xl">
        <TooltipProvider>
          <DialogHeader>
            <DialogTitle>OpenRouter Modell-Browser</DialogTitle>
            <DialogDescription>
              Wähle ein Modell von OpenRouter für KI-Funktionen.
            </DialogDescription>
          </DialogHeader>

          {/* Search */}
          <div className="relative">
            <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Modell suchen..."
              value={search}
            />
          </div>

          {/* Provider Chips */}
          <div className="flex flex-wrap gap-1.5">
            <button
              className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                providerFilter
                  ? "border-border bg-background hover:bg-muted"
                  : "border-primary bg-primary text-primary-foreground"
              }`}
              onClick={() => setProviderFilter(null)}
              type="button"
            >
              Alle ({models.length})
            </button>
            {providers.map((p) => {
              const count = models.filter(
                (m) => getProvider(m.id) === p
              ).length;
              return (
                <button
                  className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                    providerFilter === p
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-muted"
                  }`}
                  key={p}
                  onClick={() =>
                    setProviderFilter(providerFilter === p ? null : p)
                  }
                  type="button"
                >
                  {p} ({count})
                </button>
              );
            })}
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 border-b px-3 py-1.5 font-medium text-muted-foreground text-xs">
            <button
              className="flex items-center gap-1 text-left transition-colors hover:text-foreground"
              onClick={() => handleSort("name")}
              type="button"
            >
              Modell
              <SortIndicator
                field="name"
                sortDir={sortDir}
                sortField={sortField}
              />
            </button>
            <button
              className="flex w-[5.5rem] items-center justify-end gap-1 transition-colors hover:text-foreground"
              onClick={() => handleSort("date")}
              type="button"
            >
              Datum
              <SortIndicator
                field="date"
                sortDir={sortDir}
                sortField={sortField}
              />
            </button>
            <button
              className="flex w-20 items-center justify-end gap-1 transition-colors hover:text-foreground"
              onClick={() => handleSort("inputPrice")}
              type="button"
            >
              Input
              <SortIndicator
                field="inputPrice"
                sortDir={sortDir}
                sortField={sortField}
              />
            </button>
            <button
              className="flex w-20 items-center justify-end gap-1 transition-colors hover:text-foreground"
              onClick={() => handleSort("outputPrice")}
              type="button"
            >
              Output
              <SortIndicator
                field="outputPrice"
                sortDir={sortDir}
                sortField={sortField}
              />
            </button>
            <button
              className="flex w-16 items-center justify-end gap-1 transition-colors hover:text-foreground"
              onClick={() => handleSort("context")}
              type="button"
            >
              Kontext
              <SortIndicator
                field="context"
                sortDir={sortDir}
                sortField={sortField}
              />
            </button>
          </div>

          {/* Model List */}
          <div
            className="flex-1 overflow-y-auto rounded-md border"
            style={{ maxHeight: "400px" }}
          >
            <ModelListContent
              currentModel={currentModel}
              error={error}
              filtered={filtered}
              isLoading={isLoading}
              onSelect={handleSelect}
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t pt-2 text-muted-foreground text-xs">
            <span>
              {filtered.length} von {models.length} Modellen
            </span>
            <span className="text-[10px]">Kosten: $/1M Tokens</span>
          </div>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Extracted to avoid nested ternaries (biome lint/style/noNestedTernary)
// ---------------------------------------------------------------------------

interface ModelListContentProps {
  currentModel: string;
  error: Error | null;
  filtered: OpenRouterModel[];
  isLoading: boolean;
  onSelect: (modelId: string, displayName: string) => void;
}

function ModelListContent({
  isLoading,
  error,
  filtered,
  currentModel,
  onSelect,
}: ModelListContentProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Lade Modelle von OpenRouter...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12 text-destructive">
        <AlertCircle className="mr-2 h-5 w-5" />
        {error.message}
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Keine Modelle gefunden
      </div>
    );
  }

  return (
    <div className="space-y-0.5 p-1">
      {filtered.map((m) => {
        const isSelected = m.id === currentModel;
        return (
          <button
            className={`grid w-full grid-cols-[1fr_auto_auto_auto_auto] gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
              isSelected
                ? "border border-primary/30 bg-primary/10"
                : "border border-transparent hover:bg-muted"
            }`}
            key={m.id}
            onClick={() => onSelect(m.id, m.name)}
            type="button"
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <div className="flex items-center gap-2">
                {isSelected && (
                  <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                )}
                <span className="truncate font-medium">{m.name}</span>
                {m.description && (
                  <Tooltip>
                    <TooltipTrigger
                      className="shrink-0 cursor-help"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Info className="h-3.5 w-3.5 text-muted-foreground transition-colors hover:text-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm text-xs leading-relaxed">
                      {m.description}
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <Badge
                className={`w-fit text-[10px] ${providerBadgeClass(getProvider(m.id))}`}
                variant="outline"
              >
                {getProvider(m.id)}
              </Badge>
            </div>
            <div className="w-[5.5rem] self-center text-right font-mono text-muted-foreground text-xs">
              {formatDate(m.created)}
            </div>
            <div className="w-20 self-center text-right font-mono text-xs">
              {formatPrice(m.pricing.prompt)}
            </div>
            <div className="w-20 self-center text-right font-mono text-xs">
              {formatPrice(m.pricing.completion)}
            </div>
            <div className="w-16 self-center text-right font-mono text-xs">
              {formatContext(m.context_length)}
            </div>
          </button>
        );
      })}
    </div>
  );
}
