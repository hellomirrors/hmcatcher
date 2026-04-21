"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { FunnelStage } from "@/domain/leads/lead-stats";

interface FunnelCardProps {
  data: FunnelStage[];
}

const chartConfig = {
  count: { label: "Sessions", color: "var(--chart-1)" },
  dropOff: { label: "Abgesprungen", color: "var(--chart-3)" },
};

interface FunnelRow {
  count: number;
  dropOff: number;
  label: string;
  pctOfStart: number;
  pctStep: number | null;
}

function toRows(stages: FunnelStage[]): FunnelRow[] {
  if (stages.length === 0) {
    return [];
  }
  const start = stages[0].count || 0;
  return stages.map((stage, idx) => {
    const prev = idx > 0 ? stages[idx - 1].count : stage.count;
    const dropOff = idx > 0 ? Math.max(prev - stage.count, 0) : 0;
    return {
      label: stage.label,
      count: stage.count,
      dropOff,
      pctOfStart: start > 0 ? (stage.count / start) * 100 : 0,
      pctStep: idx > 0 && prev > 0 ? (stage.count / prev) * 100 : null,
    };
  });
}

export function FunnelCard({ data }: FunnelCardProps) {
  const rows = toRows(data);
  const totalDropOff = rows.reduce((sum, r) => sum + r.dropOff, 0);

  return (
    <Card className="col-span-full xl:col-span-2">
      <CardHeader>
        <CardTitle>Conversion-Funnel</CardTitle>
        <CardDescription>
          Sessions pro Phase des aktiven Dialogs. {totalDropOff} Abbrüche
          zwischen Stufen.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground text-sm">
            Für den Zeitraum liegen keine Session-Daten vor.
          </p>
        ) : (
          <ChartContainer
            className="aspect-auto h-[320px] w-full"
            config={chartConfig}
          >
            <BarChart
              data={rows}
              layout="vertical"
              margin={{ left: 24, right: 48 }}
            >
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                type="number"
              />
              <YAxis
                axisLine={false}
                dataKey="label"
                tickLine={false}
                type="category"
                width={140}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, _name, item) => {
                      const row = item?.payload as FunnelRow | undefined;
                      const pct = row?.pctOfStart ?? 0;
                      return `${value} · ${pct.toFixed(0)}% des Starts`;
                    }}
                    indicator="dot"
                  />
                }
              />
              <Bar dataKey="count" fill="var(--chart-1)" radius={[0, 6, 6, 0]}>
                <LabelList
                  className="fill-muted-foreground text-xs"
                  dataKey="pctOfStart"
                  formatter={(value) =>
                    typeof value === "number" ? `${value.toFixed(0)}%` : ""
                  }
                  position="right"
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
