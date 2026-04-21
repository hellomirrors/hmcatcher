"use client";

import { Cell, Pie, PieChart } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export interface DistributionDatum {
  count: number;
  key: string;
  label?: string;
}

interface DistributionPieProps {
  data: DistributionDatum[];
  description?: string;
  emptyHint?: string;
  title: string;
}

const CHART_VARS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function buildConfig(data: DistributionDatum[]): ChartConfig {
  const config: ChartConfig = { count: { label: "Anzahl" } };
  data.forEach((item, idx) => {
    config[item.key] = {
      label: item.label ?? item.key,
      color: CHART_VARS[idx % CHART_VARS.length],
    };
  });
  return config;
}

export function DistributionPie({
  title,
  description,
  data,
  emptyHint = "Keine Daten im ausgewählten Zeitraum.",
}: DistributionPieProps) {
  const config = buildConfig(data);
  const total = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {total === 0 ? (
          <p className="py-8 text-center text-muted-foreground text-sm">
            {emptyHint}
          </p>
        ) : (
          <>
            <ChartContainer
              className="mx-auto aspect-square h-[220px]"
              config={config}
            >
              <PieChart>
                <ChartTooltip
                  content={<ChartTooltipContent hideLabel nameKey="key" />}
                />
                <Pie
                  data={data}
                  dataKey="count"
                  innerRadius={55}
                  nameKey="key"
                  strokeWidth={2}
                >
                  {data.map((item, idx) => (
                    <Cell
                      fill={CHART_VARS[idx % CHART_VARS.length]}
                      key={item.key}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <ul className="space-y-1 text-sm">
              {data.map((item, idx) => {
                const pct = total > 0 ? (item.count / total) * 100 : 0;
                return (
                  <li className="flex items-center gap-2" key={item.key}>
                    <span
                      aria-hidden="true"
                      className="size-2.5 rounded-full"
                      style={{
                        background: CHART_VARS[idx % CHART_VARS.length],
                      }}
                    />
                    <span className="flex-1 truncate">
                      {item.label ?? item.key}
                    </span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {item.count} · {pct.toFixed(0)}%
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
