"use client";

import {
  Chart as ChartJS,
  DoughnutController,
  ArcElement,
  Tooltip as ChartTooltip,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { Card, CardContent } from "@/components/ui/card";
import { PHASE_CONFIG } from "@/lib/constants";
import { Gauge } from "lucide-react";

ChartJS.register(DoughnutController, ArcElement, ChartTooltip);

interface PhaseSpeedometerProps {
  currentPhase: string;
  peg: number;
  growthRate: number;
}

const PHASE_KEYS = Object.keys(PHASE_CONFIG) as Array<keyof typeof PHASE_CONFIG>;

const QUADRANT_COLORS = [
  "rgba(52, 211, 153, 0.6)",
  "rgba(96, 165, 250, 0.6)",
  "rgba(248, 113, 113, 0.6)",
  "rgba(251, 191, 36, 0.6)",
];

const QUADRANT_BORDERS = [
  "rgba(52, 211, 153, 1)",
  "rgba(96, 165, 250, 1)",
  "rgba(248, 113, 113, 1)",
  "rgba(251, 191, 36, 1)",
];

export function PhaseSpeedometer({ currentPhase, peg, growthRate }: PhaseSpeedometerProps) {
  const activeIndex = PHASE_KEYS.findIndex((k) => k === currentPhase);
  const phaseConf = PHASE_CONFIG[currentPhase as keyof typeof PHASE_CONFIG];

  const data = {
    labels: PHASE_KEYS.map((k) => PHASE_CONFIG[k].shortLabel),
    datasets: [
      {
        data: [1, 1, 1, 1],
        backgroundColor: QUADRANT_COLORS.map((c, i) =>
          i === activeIndex ? c.replace("0.6", "0.85") : c.replace("0.6", "0.1")
        ),
        borderColor: QUADRANT_BORDERS.map((c, i) =>
          i === activeIndex ? c : c.replace("1)", "0.15)")
        ),
        borderWidth: 2,
        circumference: 270,
        rotation: -135,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "72%",
    plugins: {
      tooltip: {
        callbacks: {
          label: (ctx: { dataIndex: number }) => {
            const key = PHASE_KEYS[ctx.dataIndex];
            return PHASE_CONFIG[key].label;
          },
        },
        backgroundColor: "rgba(0,0,0,0.8)",
        padding: 10,
        cornerRadius: 8,
      },
      legend: { display: false },
    },
  };

  return (
    <Card className="border-border/40">
      <CardContent className="py-8">
        <div className="flex flex-col lg:flex-row items-center gap-8">
          {/* Speedometer gauge */}
          <div className="relative mx-auto lg:mx-0 shrink-0" style={{ width: 260, height: 200 }}>
            <Doughnut data={data} options={options} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
              <span className={`text-lg font-bold ${phaseConf?.color ?? "text-foreground"}`}>
                {phaseConf?.label ?? "Unknown"}
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground tabular-nums">PEG {peg.toFixed(2)}</span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground tabular-nums">{growthRate}% Growth</span>
              </div>
            </div>
          </div>

          {/* Phase legend */}
          <div className="grid grid-cols-2 gap-2.5 flex-1">
            {PHASE_KEYS.map((key) => {
              const conf = PHASE_CONFIG[key];
              const isActive = key === currentPhase;
              return (
                <div
                  key={key}
                  className={`rounded-xl px-4 py-3 text-xs border transition-all ${
                    isActive
                      ? `${conf.bg} ${conf.border} ${conf.color} shadow-sm`
                      : "border-border/20 text-muted-foreground/60"
                  }`}
                >
                  <div className={`font-semibold mb-0.5 ${isActive ? conf.color : ""}`}>
                    {conf.shortLabel}
                  </div>
                  <p className="leading-relaxed">
                    {conf.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
