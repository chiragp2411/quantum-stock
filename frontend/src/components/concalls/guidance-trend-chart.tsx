"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useChartTheme } from "@/hooks/use-chart-theme";
import { TrendingUp } from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ConcallAnalysis {
  quarter: string;
  analysis: {
    tone_score: number;
    management_execution_score: number;
  } | null;
}

interface GuidanceTrendChartProps {
  concalls: ConcallAnalysis[];
}

export function GuidanceTrendChart({ concalls }: GuidanceTrendChartProps) {
  const { gridColor, tickColor, legendColor } = useChartTheme();
  const analyzed = concalls.filter((c) => c.analysis);

  if (analyzed.length < 2) {
    return (
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            Guidance Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-sm text-muted-foreground/60 text-center">
              Need at least 2 analyzed quarters to show trend
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const labels = analyzed.map((c) => c.quarter);
  const toneData = analyzed.map((c) => c.analysis!.tone_score);
  const execData = analyzed.map((c) => c.analysis!.management_execution_score);

  const lastTone = toneData[toneData.length - 1];
  const prevTone = toneData[toneData.length - 2];
  const trendUp = lastTone >= prevTone;

  const data = {
    labels,
    datasets: [
      {
        label: "Tone Score",
        data: toneData,
        borderColor: trendUp ? "rgba(52, 211, 153, 0.9)" : "rgba(248, 113, 113, 0.9)",
        backgroundColor: trendUp ? "rgba(52, 211, 153, 0.08)" : "rgba(248, 113, 113, 0.08)",
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: trendUp ? "rgb(52, 211, 153)" : "rgb(248, 113, 113)",
        borderWidth: 2,
      },
      {
        label: "Execution Score",
        data: execData,
        borderColor: "rgba(96, 165, 250, 0.9)",
        backgroundColor: "rgba(96, 165, 250, 0.08)",
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: "rgb(96, 165, 250)",
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index" as const, intersect: false },
    scales: {
      y: {
        min: 0,
        max: 10,
        grid: { color: gridColor, drawBorder: false },
        ticks: { color: tickColor, stepSize: 2 },
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
        labels: { color: legendColor, usePointStyle: true, pointStyle: "circle", padding: 16, font: { size: 11 } },
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
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          Guidance Trend
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <Line data={data} options={options} />
        </div>
      </CardContent>
    </Card>
  );
}
