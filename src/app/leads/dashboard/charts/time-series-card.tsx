"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
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
import type { TimeSeriesPoint } from "@/domain/leads/lead-stats";

interface TimeSeriesCardProps {
  data: TimeSeriesPoint[];
  range: "24h" | "7d" | "30d" | "all";
}

const chartConfig = {
  count: {
    label: "Leads",
    color: "var(--chart-1)",
  },
};

function formatTick(iso: string, range: TimeSeriesCardProps["range"]): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  if (range === "24h") {
    return new Intl.DateTimeFormat("de-DE", {
      hour: "2-digit",
      timeZone: "Europe/Berlin",
    }).format(date);
  }
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Berlin",
  }).format(date);
}

export function TimeSeriesCard({ data, range }: TimeSeriesCardProps) {
  return (
    <Card className="col-span-full xl:col-span-2">
      <CardHeader>
        <CardTitle>Lead-Eingang</CardTitle>
        <CardDescription>
          Wann die Leads eingelaufen sind ({range}).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          className="aspect-auto h-[260px] w-full"
          config={chartConfig}
        >
          <AreaChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
            <defs>
              <linearGradient id="fillCount" x1="0" x2="0" y1="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--chart-1)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--chart-1)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="bucket"
              minTickGap={24}
              tickFormatter={(v) => formatTick(String(v), range)}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  indicator="line"
                  labelFormatter={(label) => formatTick(String(label), range)}
                />
              }
            />
            <Area
              dataKey="count"
              fill="url(#fillCount)"
              stroke="var(--chart-1)"
              strokeWidth={2}
              type="monotone"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
