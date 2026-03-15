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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useChartTheme } from "@/hooks/use-chart-theme";
import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";

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
    guidance_trajectory?: string | null;
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
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            Management Confidence & Execution
          </CardTitle>
          <CardDescription className="text-xs">
            How management tone and delivery evolve quarter over quarter
          </CardDescription>
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
  const trendDirection = lastTone > prevTone ? "up" : lastTone < prevTone ? "down" : "flat";

  const data = {
    labels,
    datasets: [
      {
        label: "Tone Score",
        data: toneData,
        borderColor: trendDirection === "up" ? "rgba(52, 211, 153, 0.9)" : trendDirection === "down" ? "rgba(248, 113, 113, 0.9)" : "rgba(148, 163, 184, 0.9)",
        backgroundColor: trendDirection === "up" ? "rgba(52, 211, 153, 0.06)" : trendDirection === "down" ? "rgba(248, 113, 113, 0.06)" : "rgba(148, 163, 184, 0.06)",
        fill: true,
        tension: 0.35,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: trendDirection === "up" ? "rgb(52, 211, 153)" : trendDirection === "down" ? "rgb(248, 113, 113)" : "rgb(148, 163, 184)",
        borderWidth: 2.5,
      },
      {
        label: "Execution Score",
        data: execData,
        borderColor: "rgba(96, 165, 250, 0.9)",
        backgroundColor: "rgba(96, 165, 250, 0.06)",
        fill: true,
        tension: 0.35,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: "rgb(96, 165, 250)",
        borderWidth: 2.5,
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
        ticks: { color: tickColor, stepSize: 2, font: { size: 11 } },
        border: { display: false },
      },
      x: {
        grid: { display: false },
        ticks: { color: tickColor, font: { size: 11 } },
        border: { display: false },
      },
    },
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: { color: legendColor, usePointStyle: true, pointStyle: "circle", padding: 20, font: { size: 11 } },
      },
      tooltip: {
        backgroundColor: "rgba(0,0,0,0.85)",
        padding: 12,
        cornerRadius: 8,
        titleFont: { size: 12, weight: "bold" as const },
        bodyFont: { size: 12 },
      },
    },
  };

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              {trendDirection === "up" && <TrendingUp className="h-4 w-4 text-emerald-500" />}
              {trendDirection === "down" && <TrendingDown className="h-4 w-4 text-red-400" />}
              {trendDirection === "flat" && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
              Management Confidence & Execution
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Tone: how openly management shares data &middot; Execution: how well they deliver on promises
            </CardDescription>
          </div>
          <div className="text-right">
            <div className={`text-lg font-bold tabular-nums ${lastTone >= 7 ? "text-emerald-500" : lastTone >= 4 ? "text-blue-400" : "text-red-400"}`}>
              {lastTone}/10
            </div>
            <div className="text-[10px] text-muted-foreground">Latest Tone</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <Line data={data} options={options} />
        </div>
      </CardContent>
    </Card>
  );
}
