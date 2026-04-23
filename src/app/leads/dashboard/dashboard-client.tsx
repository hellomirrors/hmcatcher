"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { BellOff, BellRing, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  DialogOption,
  DistributionBucket,
  FunnelStage,
  StatsRange,
  SummaryStats,
  TimeSeriesPoint,
} from "@/domain/leads/lead-stats";
import { DistributionPie } from "./charts/distribution-pie";
import { FunnelCard } from "./charts/funnel-card";
import { KpiTile } from "./charts/kpi-tile";
import { TimeSeriesCard } from "./charts/time-series-card";
import { useLeadPing } from "./use-lead-ping";
import { primeAudio } from "./win-audio";

export interface DashboardPayload {
  arbeitsbereich: DistributionBucket[];
  bucket: DistributionBucket[];
  dialogId: number | null;
  dialogOptions: DialogOption[];
  einrichtungstyp: DistributionBucket[];
  funnel: FunnelStage[];
  generatedAt: string;
  range: StatsRange;
  rolle: DistributionBucket[];
  summary: SummaryStats;
  timeSeries: TimeSeriesPoint[];
}

interface DashboardClientProps {
  initial: DashboardPayload;
}

const RANGE_LABELS: Record<StatsRange, string> = {
  "1h": "1 Stunde",
  "2h": "2 Stunden",
  "4h": "4 Stunden",
  "8h": "8 Stunden",
  "12h": "12 Stunden",
  "16h": "16 Stunden",
  "24h": "24 Stunden",
  "48h": "48 Stunden",
  "72h": "72 Stunden",
  "7d": "7 Tage",
  "30d": "30 Tage",
  all: "Alle",
};

const BUCKET_LABEL: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  none: "Ohne Bucket",
};

const MUTE_STORAGE_KEY = "hm-dashboard-muted";

async function fetchStats(
  range: StatsRange,
  dialogId: string
): Promise<DashboardPayload> {
  const qs = new URLSearchParams({ range });
  if (dialogId) {
    qs.set("dialogId", dialogId);
  }
  const res = await fetch(`/api/leads/stats?${qs.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to load stats: ${res.status}`);
  }
  return (await res.json()) as DashboardPayload;
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("de-DE").format(n);
}

export function DashboardClient({ initial }: DashboardClientProps) {
  const [range, setRange] = useState<StatsRange>(initial.range);
  const [dialogId, setDialogId] = useState<string>(
    initial.dialogId ? String(initial.dialogId) : "active"
  );
  const [muted, setMuted] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.localStorage.getItem(MUTE_STORAGE_KEY);
    if (stored === "false") {
      setMuted(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MUTE_STORAGE_KEY, String(muted));
    }
  }, [muted]);

  const query = useQuery<DashboardPayload>({
    queryKey: ["leads-stats", range, dialogId],
    queryFn: () => fetchStats(range, dialogId),
    refetchInterval: 5000,
    placeholderData: keepPreviousData,
    initialData:
      range === initial.range &&
      dialogId === (initial.dialogId ? String(initial.dialogId) : "active")
        ? initial
        : undefined,
  });

  const data = query.data ?? initial;

  useLeadPing(data.summary.latestLeadId, muted);

  const handleRangeChange = (value: string | null) => {
    if (!value) {
      return;
    }
    primeAudio();
    setRange(value as StatsRange);
  };

  const handleDialogChange = (value: string | null) => {
    if (!value) {
      return;
    }
    primeAudio();
    setDialogId(value);
  };

  const handleToggleMute = () => {
    primeAudio();
    setMuted((m) => !m);
  };

  const bucketData = useMemo(
    () =>
      data.bucket.map((b) => ({
        key: b.key,
        count: b.count,
        label: BUCKET_LABEL[b.key] ?? b.key,
      })),
    [data.bucket]
  );

  const arbeitsbereichData = useMemo(
    () =>
      data.arbeitsbereich.map((a) => ({
        key: a.key,
        count: a.count,
        label: a.key,
      })),
    [data.arbeitsbereich]
  );

  const rolleData = useMemo(
    () => data.rolle.map((r) => ({ key: r.key, count: r.count, label: r.key })),
    [data.rolle]
  );

  const einrichtungsTypData = useMemo(
    () =>
      data.einrichtungstyp.map((e) => ({
        key: e.key,
        count: e.count,
        label: e.key,
      })),
    [data.einrichtungstyp]
  );

  return (
    <div className="flex min-h-screen flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-semibold text-2xl">Lead-Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Live-Monitor · Update alle 5 s · Zeitzone Europe/Berlin
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select onValueChange={handleRangeChange} value={range}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(RANGE_LABELS) as StatsRange[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {RANGE_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select onValueChange={handleDialogChange} value={dialogId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Aktiver Dialog</SelectItem>
              <SelectItem value="all">Alle Dialoge</SelectItem>
              {data.dialogOptions.map((d) => (
                <SelectItem key={d.id} value={String(d.id)}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            aria-label={muted ? "Ton aktivieren" : "Ton stummschalten"}
            onClick={handleToggleMute}
            size="sm"
            variant={muted ? "outline" : "default"}
          >
            {muted ? (
              <BellOff className="size-4" />
            ) : (
              <BellRing className="size-4" />
            )}
            <span className="ml-2 hidden sm:inline">
              {muted ? "Ton aus" : "Ton an"}
            </span>
          </Button>
          <Link
            className={buttonVariants({ variant: "outline", size: "sm" })}
            href="/leads"
          >
            Zur Liste
          </Link>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <KpiTile
          hint={`${formatNumber(data.summary.totalCompleted)} abgeschlossen`}
          icon={<Users className="size-5" />}
          label="Leads"
          value={formatNumber(data.summary.totalLeads)}
        />
        <KpiTile
          accent="success"
          hint={
            data.summary.latestConsentAt
              ? `Letzter Lead ${new Intl.DateTimeFormat("de-DE", {
                  timeStyle: "short",
                  timeZone: "Europe/Berlin",
                }).format(new Date(data.summary.latestConsentAt))}`
              : "Noch keine Leads"
          }
          label="Ø Score"
          value={data.summary.avgScore.toFixed(1)}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <TimeSeriesCard data={data.timeSeries} range={range} />
        <FunnelCard data={data.funnel} />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DistributionPie
          data={arbeitsbereichData}
          description="In welchem Bereich arbeiten die Leads?"
          title="Arbeitsbereich"
        />
        <DistributionPie
          data={rolleData}
          description="Rolle in der Einrichtung"
          title="Rolle"
        />
        <DistributionPie
          data={einrichtungsTypData}
          description="Einrichtungstyp"
          title="Einrichtungstyp"
        />
        <DistributionPie
          data={bucketData}
          description="Score-Bucket-Verteilung"
          title="Score-Bucket"
        />
      </section>
    </div>
  );
}
