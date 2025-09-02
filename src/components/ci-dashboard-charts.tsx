import React, { useMemo } from "react";
import { Card, Title, Text } from "@tremor/react";
import { AreaChart, DonutChart } from "@tremor/react";
import type { CIBuild, CIStatistics } from "@/types/ci-dashboard.types";

interface CIDashboardChartsProps {
  builds: CIBuild[];
  statistics: CIStatistics | null;
}

function formatDate(date: Date): string {
  // Return YYYY-MM-DD
  return date.toISOString().slice(0, 10);
}

export function CIDashboardCharts({ builds }: CIDashboardChartsProps) {
  const { dailyData, statusDistribution } = useMemo(() => {
    // Group builds by day for last 14 days
    const today = new Date();
    const days: string[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push(formatDate(d));
    }

    const dailyMap = new Map(
      days.map((d) => [
        d,
        { date: d, Success: 0, Failure: 0, Pending: 0, Running: 0 },
      ]),
    );

    let success = 0;
    let failure = 0;
    let pending = 0;
    let running = 0;

    for (const b of builds) {
      const day = b.timestamp?.slice(0, 10) || formatDate(new Date());
      const row = dailyMap.get(day);
      const status = b.status;
      if (row) {
        if (status === "success") row.Success += 1;
        else if (status === "failure") row.Failure += 1;
        else if (status === "pending") row.Pending += 1;
        else if (status === "running") row.Running += 1;
      }

      if (status === "success") success++;
      else if (status === "failure") failure++;
      else if (status === "pending") pending++;
      else if (status === "running") running++;
    }

    const dailyData = Array.from(dailyMap.values());

    const statusDistribution = [
      { name: "Success", value: success },
      { name: "Failure", value: failure },
      { name: "Pending", value: pending },
      { name: "Running", value: running },
    ];

    return { dailyData, statusDistribution };
  }, [builds]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-2">
        <Title>Build Activity (last 14 days)</Title>
        <Text>Volume of builds per day by status</Text>
        <div className="mt-4">
          <AreaChart
            className="h-72"
            data={dailyData}
            index="date"
            categories={["Success", "Failure", "Pending", "Running"]}
            colors={["emerald", "rose", "amber", "blue"]}
            yAxisWidth={42}
            curveType="monotone"
          />
        </div>
      </Card>

      <Card>
        <Title>Status Distribution</Title>
        <Text>Current distribution across recent builds</Text>
        <div className="mt-4">
          <DonutChart
            className="h-72"
            data={statusDistribution}
            category="value"
            index="name"
            colors={["emerald", "rose", "amber", "blue"]}
            valueFormatter={(n: number) => `${n}`}
            variant="pie"
          />
        </div>
      </Card>
    </div>
  );
}
