"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useChartTheme } from "@/hooks/use-chart-theme";
import { BarChart3 } from "lucide-react";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface TrackerRow {
  period: string;
  prev_guidance: Record<string, string>;
  actuals: Record<string, string>;
  met_missed: string;
}

interface GuidanceVsActualsChartProps {
  tracker: TrackerRow[];
}

function extractNumber(val: string): number | null {
  const match = val.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : null;
}

export function GuidanceVsActualsChart({ tracker }: GuidanceVsActualsChartProps) {
  const { gridColor, tickColor, legendColor } = useChartTheme();

  const rowsWithData = tracker.filter(
    (r) =>
      Object.keys(r.prev_guidance).length > 0 &&
      Object.keys(r.actuals).length > 0
  );

  if (rowsWithData.length === 0) {
    return (
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            Guidance vs Actuals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-sm text-muted-foreground/60 text-center">
              No guidance-to-actuals comparisons available yet
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const labels = rowsWithData.map((r) => r.period);
  const guidanceValues = rowsWithData.map((r) => {
    const firstKey = Object.keys(r.prev_guidance)[0];
    return firstKey ? extractNumber(r.prev_guidance[firstKey]) ?? 0 : 0;
  });
  const actualValues = rowsWithData.map((r) => {
    const firstKey = Object.keys(r.actuals)[0];
    return firstKey ? extractNumber(r.actuals[firstKey]) ?? 0 : 0;
  });

  const data = {
    labels,
    datasets: [
      {
        label: "Guidance",
        data: guidanceValues,
        backgroundColor: "rgba(96, 165, 250, 0.5)",
        borderColor: "rgba(96, 165, 250, 0.9)",
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false as const,
      },
      {
        label: "Actuals",
        data: actualValues,
        backgroundColor: "rgba(52, 211, 153, 0.5)",
        borderColor: "rgba(52, 211, 153, 0.9)",
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false as const,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index" as const, intersect: false },
    scales: {
      y: {
        grid: { color: gridColor, drawBorder: false },
        ticks: { color: tickColor },
        border: { display: false },
      },
      x: {
        grid: { display: false },
        ticks: { color: tickColor },
        border: { display: false },
      },
    },
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: { color: legendColor, usePointStyle: true, pointStyle: "rectRounded", padding: 16, font: { size: 11 } },
      },
      tooltip: {
        backgroundColor: "rgba(0,0,0,0.8)",
        padding: 10,
        cornerRadius: 8,
        titleFont: { size: 12 },
        bodyFont: { size: 12 },
      },
    },
  };

  return (
    <Card className="border-border/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          Guidance vs Actuals
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <Bar data={data} options={options} />
        </div>
      </CardContent>
    </Card>
  );
}
