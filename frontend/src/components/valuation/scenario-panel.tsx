"use client";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TOOLTIPS, PHASE_CONFIG } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, TrendingUp, TrendingDown, Minus, ArrowDown, ArrowUp } from "lucide-react";

interface Scenario {
  label: string;
  growth_rate: number;
  forward_eps: number;
  forward_pat: number;
  forward_pe: number;
  peg: number;
  fair_value: number;
  upside_pct: number;
  phase: string;
  phase_label: string;
}

interface ScenarioPanelProps {
  base: Scenario;
  bull: Scenario;
  bear: Scenario;
  currentPrice: number;
}

export function ScenarioPanel({ base, bull, bear, currentPrice }: ScenarioPanelProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <ScenarioCard scenario={bear} accent="red" currentPrice={currentPrice} />
      <ScenarioCard scenario={base} accent="blue" currentPrice={currentPrice} isBase />
      <ScenarioCard scenario={bull} accent="emerald" currentPrice={currentPrice} />
    </div>
  );
}

function ScenarioCard({
  scenario,
  accent,
  currentPrice,
  isBase,
}: {
  scenario: Scenario;
  accent: "emerald" | "blue" | "red";
  currentPrice: number;
  isBase?: boolean;
}) {
  const phaseConf = PHASE_CONFIG[scenario.phase as keyof typeof PHASE_CONFIG];
  const accentMap = {
    emerald: {
      border: "border-emerald-500/25",
      headerBg: "bg-emerald-500/5",
      title: "text-emerald-500",
      icon: <ArrowUp className="h-4 w-4" />,
    },
    blue: {
      border: "border-blue-500/25",
      headerBg: "bg-blue-500/5",
      title: "text-blue-400",
      icon: <Minus className="h-4 w-4" />,
    },
    red: {
      border: "border-red-500/25",
      headerBg: "bg-red-500/5",
      title: "text-red-400",
      icon: <ArrowDown className="h-4 w-4" />,
    },
  };
  const c = accentMap[accent];

  return (
    <Card className={`border-border/40 ${c.border} overflow-hidden ${isBase ? "ring-1 ring-blue-500/20" : ""}`}>
      {/* Header */}
      <div className={`px-5 py-3.5 ${c.headerBg} border-b border-border/20`}>
        <div className="flex items-center justify-between">
          <span className={`text-sm font-bold ${c.title}`}>
            {scenario.label} Case
          </span>
          <Badge variant="outline" className="text-[10px] font-medium">
            {scenario.growth_rate}% growth
          </Badge>
        </div>
      </div>

      <CardContent className="p-5 space-y-3">
        <MetricRow label="Forward EPS" value={`₹${scenario.forward_eps}`} />
        <MetricRow label="Forward PE" value={scenario.forward_pe.toFixed(1)} tooltip={TOOLTIPS.forwardPE} />
        <MetricRow
          label="PEG"
          value={scenario.peg.toFixed(2)}
          tooltip={TOOLTIPS.peg}
          highlight={scenario.peg < 1 ? "emerald" : scenario.peg > 2 ? "red" : undefined}
        />
        <MetricRow label="Fair Value" value={`₹${scenario.fair_value.toLocaleString("en-IN")}`} tooltip={TOOLTIPS.fairValue} />

        {/* Upside */}
        <div className="pt-3 border-t border-border/30">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Upside</span>
            <span
              className={`text-xl font-bold flex items-center gap-1 tabular-nums ${
                scenario.upside_pct > 0
                  ? "text-emerald-500"
                  : scenario.upside_pct < 0
                    ? "text-red-400"
                    : "text-muted-foreground"
              }`}
            >
              {scenario.upside_pct > 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : scenario.upside_pct < 0 ? (
                <TrendingDown className="h-4 w-4" />
              ) : null}
              {scenario.upside_pct > 0 ? "+" : ""}
              {scenario.upside_pct}%
            </span>
          </div>
        </div>

        {phaseConf && (
          <Badge variant="outline" className={`text-[10px] font-medium ${phaseConf.bg} ${phaseConf.color} ${phaseConf.border}`}>
            {phaseConf.shortLabel}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

function MetricRow({
  label,
  value,
  tooltip,
  highlight,
}: {
  label: string;
  value: string;
  tooltip?: string;
  highlight?: "emerald" | "red";
}) {
  const valueColor = highlight
    ? highlight === "emerald"
      ? "text-emerald-500"
      : "text-red-400"
    : "text-foreground";

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground flex items-center gap-1">
        {label}
        {tooltip && (
          <Tooltip>
            <TooltipTrigger>
              <HelpCircle className="h-3 w-3 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </span>
      <span className={`text-sm font-semibold tabular-nums ${valueColor}`}>{value}</span>
    </div>
  );
}
