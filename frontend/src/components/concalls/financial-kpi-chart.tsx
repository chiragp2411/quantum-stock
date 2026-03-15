"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useChartTheme } from "@/hooks/use-chart-theme";
import { IndianRupee, TrendingUp, Percent } from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface FinancialDataPoint {
  quarter: string;
  revenue_cr?: number;
  ebitda_cr?: number;
  pat_cr?: number;
  ebitda_margin_pct?: number;
  pat_margin_pct?: number;
  revenue_growth_yoy_pct?: number;
  pat_growth_yoy_pct?: number;
}

interface FinancialKpiChartProps {
  data: FinancialDataPoint[];
}

export function FinancialKpiChart({ data }: FinancialKpiChartProps) {
  const { gridColor, tickColor, legendColor } = useChartTheme();

  if (data.length < 1) {
    return (
      <Card className="border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <IndianRupee className="h-4 w-4 text-amber-500" />
            Financial Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-sm text-muted-foreground/60 text-center">
              No financial data extracted yet
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const labels = data.map((d) => d.quarter);
  const hasAbsolute = data.some((d) => d.revenue_cr != null || d.pat_cr != null);
  const hasMargins = data.some((d) => d.ebitda_margin_pct != null || d.pat_margin_pct != null);
  const hasGrowth = data.some((d) => d.revenue_growth_yoy_pct != null || d.pat_growth_yoy_pct != null);

  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index" as const, intersect: false },
    scales: {
      y: {
        grid: { color: gridColor, drawBorder: false },
        ticks: { color: tickColor, font: { size: 11 } },
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
        labels: { color: legendColor, usePointStyle: true, pointStyle: "rectRounded", padding: 20, font: { size: 11 } },
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

  const absoluteData = {
    labels,
    datasets: [
      {
        label: "Revenue (₹ cr)",
        data: data.map((d) => d.revenue_cr ?? null),
        backgroundColor: "rgba(96, 165, 250, 0.5)",
        borderColor: "rgba(96, 165, 250, 0.9)",
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false as const,
      },
      {
        label: "EBITDA (₹ cr)",
        data: data.map((d) => d.ebitda_cr ?? null),
        backgroundColor: "rgba(52, 211, 153, 0.5)",
        borderColor: "rgba(52, 211, 153, 0.9)",
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false as const,
      },
      {
        label: "PAT (₹ cr)",
        data: data.map((d) => d.pat_cr ?? null),
        backgroundColor: "rgba(251, 191, 36, 0.5)",
        borderColor: "rgba(251, 191, 36, 0.9)",
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false as const,
      },
    ],
  };

  const marginData = {
    labels,
    datasets: [
      {
        label: "EBITDA Margin %",
        data: data.map((d) => d.ebitda_margin_pct ?? null),
        borderColor: "rgba(52, 211, 153, 0.9)",
        backgroundColor: "rgba(52, 211, 153, 0.06)",
        fill: true,
        tension: 0.35,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: "rgb(52, 211, 153)",
        borderWidth: 2.5,
      },
      {
        label: "PAT Margin %",
        data: data.map((d) => d.pat_margin_pct ?? null),
        borderColor: "rgba(251, 191, 36, 0.9)",
        backgroundColor: "rgba(251, 191, 36, 0.06)",
        fill: true,
        tension: 0.35,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: "rgb(251, 191, 36)",
        borderWidth: 2.5,
      },
    ],
  };

  const growthData = {
    labels,
    datasets: [
      {
        label: "Revenue Growth YoY %",
        data: data.map((d) => d.revenue_growth_yoy_pct ?? null),
        borderColor: "rgba(96, 165, 250, 0.9)",
        backgroundColor: "rgba(96, 165, 250, 0.06)",
        fill: true,
        tension: 0.35,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: "rgb(96, 165, 250)",
        borderWidth: 2.5,
      },
      {
        label: "PAT Growth YoY %",
        data: data.map((d) => d.pat_growth_yoy_pct ?? null),
        borderColor: "rgba(251, 191, 36, 0.9)",
        backgroundColor: "rgba(251, 191, 36, 0.06)",
        fill: true,
        tension: 0.35,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: "rgb(251, 191, 36)",
        borderWidth: 2.5,
      },
    ],
  };

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <IndianRupee className="h-4 w-4 text-amber-500" />
          Financial Performance
        </CardTitle>
        <CardDescription className="text-xs">
          Revenue, profitability, and growth trends extracted from con-calls
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={hasAbsolute ? "absolute" : hasMargins ? "margins" : "growth"}>
          <TabsList className="mb-4 h-8">
            {hasAbsolute && (
              <TabsTrigger value="absolute" className="text-xs gap-1 h-7 px-3">
                <IndianRupee className="h-3 w-3" />
                Revenue / PAT
              </TabsTrigger>
            )}
            {hasMargins && (
              <TabsTrigger value="margins" className="text-xs gap-1 h-7 px-3">
                <Percent className="h-3 w-3" />
                Margins
              </TabsTrigger>
            )}
            {hasGrowth && (
              <TabsTrigger value="growth" className="text-xs gap-1 h-7 px-3">
                <TrendingUp className="h-3 w-3" />
                Growth %
              </TabsTrigger>
            )}
          </TabsList>

          {hasAbsolute && (
            <TabsContent value="absolute">
              <div className="h-64">
                <Bar data={absoluteData} options={baseOptions} />
              </div>
            </TabsContent>
          )}
          {hasMargins && (
            <TabsContent value="margins">
              <div className="h-64">
                <Line data={marginData} options={baseOptions} />
              </div>
            </TabsContent>
          )}
          {hasGrowth && (
            <TabsContent value="growth">
              <div className="h-64">
                <Line data={growthData} options={baseOptions} />
              </div>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
