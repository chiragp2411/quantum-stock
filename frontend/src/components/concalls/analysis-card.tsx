"use client";

import { useState } from "react";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TOOLTIPS } from "@/lib/constants";
import {
  AlertTriangle,
  ExternalLink,
  Flag,
  Loader2,
  RefreshCw,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  Building2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { AnalysisDrawer } from "./analysis-drawer";

interface Analysis {
  quarter: string;
  detailed_summary?: string;
  highlights: string[];
  tone_score: number;
  guidance: Record<string, string>;
  green_flags: string[];
  red_flags: string[];
  management_execution_score: number;
  key_quotes: string[];
  lynch_category?: string;
  confidence?: number;
  error?: string | null;
  business_model?: string | null;
  moat_signals?: string[];
  competitive_advantages?: string[];
  revenue_cr?: number | null;
  ebitda_cr?: number | null;
  pat_cr?: number | null;
  ebitda_margin_pct?: number | null;
  pat_margin_pct?: number | null;
  revenue_growth_yoy_pct?: number | null;
  pat_growth_yoy_pct?: number | null;
  guidance_trajectory?: string | null;
  guidance_trajectory_detail?: string | null;
  contradictions?: string[];
  capex_plans?: string[];
  capacity_utilization?: string | null;
  geographic_expansion?: string[];
  investment_thesis?: string[];
  sector_best_pick_rationale?: string | null;
  analysis_provider?: string | null;
  prev_guidance_comparison?: Record<string, Record<string, unknown>> | null;
}

interface AnalysisCardProps {
  symbol: string;
  concall: {
    _id: string;
    quarter: string;
    pdf_filename: string;
    analysis: Analysis | null;
    status?: string;
    uploaded_at: string;
  };
  onReanalyzed?: () => void;
  onDelete?: (id: string) => void;
}

function isFailedAnalysis(analysis: Analysis): boolean {
  return (
    !!analysis.error ||
    (analysis.quarter === "Unknown" &&
      analysis.tone_score === 5 &&
      analysis.management_execution_score === 5 &&
      analysis.highlights.length === 0 &&
      analysis.green_flags.length === 0 &&
      analysis.red_flags.length === 0)
  );
}

export function AnalysisCard({ symbol, concall, onReanalyzed, onDelete }: AnalysisCardProps) {
  const [reanalyzing, setReanalyzing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const analysis = concall.analysis;
  const concallStatus = concall.status || (analysis ? "completed" : "pending");

  const handleReanalyze = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setReanalyzing(true);
    try {
      await api.post(
        `/api/concalls/${encodeURIComponent(symbol)}/reanalyze/${concall._id}`
      );
      toast.success("Re-analysis started");
      onReanalyzed?.();
    } catch {
      toast.error("Re-analysis failed");
    } finally {
      setReanalyzing(false);
    }
  };

  const displayLabel =
    analysis?.quarter && analysis.quarter !== "Unknown"
      ? analysis.quarter
      : concall.quarter || concall.pdf_filename;

  if (concallStatus === "queued" || concallStatus === "analyzing") {
    return (
      <Card className="border-blue-500/20 bg-blue-500/[0.03]">
        <CardHeader className="py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
              <span className="text-sm font-medium text-muted-foreground">
                {concall.quarter || concall.pdf_filename}
              </span>
            </div>
            <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/20">
              {concallStatus === "queued" ? "Queued" : "Analyzing..."}
            </Badge>
          </div>
        </CardHeader>
      </Card>
    );
  }

  if (!analysis || concallStatus === "pending") {
    return (
      <Card className="border-dashed border-border/50">
        <CardHeader className="py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-2 w-2 rounded-full bg-amber-400" />
              <span className="text-sm font-medium text-muted-foreground">
                {concall.quarter || concall.pdf_filename}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/20">
                Pending
              </Badge>
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
                  onClick={() => onDelete(concall._id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  if (isFailedAnalysis(analysis)) {
    return (
      <Card className="border-red-500/20 bg-red-500/[0.03]">
        <CardHeader className="py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <span className="text-sm font-medium">{displayLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-400 border-red-500/20">
                Failed
              </Badge>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={handleReanalyze}
                disabled={reanalyzing}
              >
                {reanalyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Retry
              </Button>
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
                  onClick={(e) => { e.stopPropagation(); onDelete(concall._id); }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
          <p className="text-sm text-red-400/80 mt-2">
            {analysis.error || "Analysis returned empty results. Check backend logs."}
          </p>
        </CardHeader>
      </Card>
    );
  }

  const trajectory = analysis.guidance_trajectory;
  const hasThesis = analysis.investment_thesis && analysis.investment_thesis.length > 0;

  return (
    <>
      <Card
        className="border-border/40 transition-all duration-200 hover:border-border/60 hover:shadow-sm cursor-pointer group"
        onClick={() => setDrawerOpen(true)}
      >
        <CardHeader className="py-4 sm:py-5">
          {/* Row 1: Quarter, scores, badges, actions */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-sm font-bold whitespace-nowrap">{displayLabel}</span>

              {trajectory && (
                <TrajectoryIndicator trajectory={trajectory} />
              )}

              <div className="hidden sm:flex items-center gap-3">
                <ScoreGauge label="Tone" value={analysis.tone_score} color="blue" tooltip={TOOLTIPS.toneScore} />
                <ScoreGauge label="Exec" value={analysis.management_execution_score} color="emerald" tooltip={TOOLTIPS.executionScore} />
              </div>

              {analysis.lynch_category && (
                <Badge variant="outline" className="hidden md:flex text-[10px] px-2 py-0 bg-purple-500/10 text-purple-400 border-purple-500/20">
                  {analysis.lynch_category}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {analysis.analysis_provider === "gemini" && (
                <Tooltip>
                  <TooltipTrigger>
                    <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                  </TooltipTrigger>
                  <TooltipContent>Analyzed by Gemini</TooltipContent>
                </Tooltip>
              )}

              <div className="hidden sm:flex items-center gap-1.5">
                <Badge variant="outline" className="text-[10px] px-2 py-0 bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                  {analysis.green_flags.length} green
                </Badge>
                <Badge variant="outline" className="text-[10px] px-2 py-0 bg-red-500/10 text-red-400 border-red-500/20">
                  {analysis.red_flags.length} red
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={(e) => { e.stopPropagation(); handleReanalyze(e); }}
                disabled={reanalyzing}
              >
                {reanalyzing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </Button>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
            </div>
          </div>

          {/* Row 2: Financial KPIs inline (only for Gemini-analyzed) */}
          {(analysis.revenue_cr != null || analysis.pat_cr != null || analysis.pat_growth_yoy_pct != null) && (
            <div className="flex items-center gap-4 mt-2.5 text-xs text-muted-foreground">
              {analysis.revenue_cr != null && (
                <KpiChip label="Rev" value={`₹${analysis.revenue_cr.toLocaleString("en-IN")} cr`} growth={analysis.revenue_growth_yoy_pct} />
              )}
              {analysis.pat_cr != null && (
                <KpiChip label="PAT" value={`₹${analysis.pat_cr.toLocaleString("en-IN")} cr`} growth={analysis.pat_growth_yoy_pct} />
              )}
              {analysis.ebitda_margin_pct != null && (
                <KpiChip label="EBITDA Margin" value={`${analysis.ebitda_margin_pct}%`} />
              )}
              {analysis.pat_margin_pct != null && (
                <KpiChip label="PAT Margin" value={`${analysis.pat_margin_pct}%`} />
              )}
            </div>
          )}

          {/* Row 3: First thesis bullet preview */}
          {hasThesis && (
            <p className="text-xs text-muted-foreground/70 mt-2 line-clamp-1 italic">
              {analysis.investment_thesis![0]}
            </p>
          )}

          {/* Mobile scores */}
          <div className="flex sm:hidden items-center gap-3 mt-3">
            <ScoreGauge label="Tone" value={analysis.tone_score} color="blue" tooltip={TOOLTIPS.toneScore} />
            <ScoreGauge label="Exec" value={analysis.management_execution_score} color="emerald" tooltip={TOOLTIPS.executionScore} />
            <div className="flex items-center gap-1.5 ml-auto">
              <Badge variant="outline" className="text-[10px] px-2 py-0 bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                {analysis.green_flags.length} green
              </Badge>
              <Badge variant="outline" className="text-[10px] px-2 py-0 bg-red-500/10 text-red-400 border-red-500/20">
                {analysis.red_flags.length} red
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      <AnalysisDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        analysis={analysis}
        displayLabel={displayLabel}
        filename={concall.pdf_filename}
      />
    </>
  );
}

function TrajectoryIndicator({ trajectory }: { trajectory: string }) {
  const config: Record<string, { icon: React.ReactNode; className: string; tip: string }> = {
    up: {
      icon: <TrendingUp className="h-3.5 w-3.5" />,
      className: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      tip: "Guidance trajectory: Upward — management raising estimates",
    },
    down: {
      icon: <TrendingDown className="h-3.5 w-3.5" />,
      className: "text-red-400 bg-red-500/10 border-red-500/20",
      tip: "Guidance trajectory: Downward — guidance being cut",
    },
    flat: {
      icon: <Minus className="h-3.5 w-3.5" />,
      className: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20",
      tip: "Guidance trajectory: Flat — maintained guidance",
    },
  };
  const c = config[trajectory] ?? config.flat;

  return (
    <Tooltip>
      <TooltipTrigger>
        <Badge variant="outline" className={`gap-1 text-[10px] ${c.className}`}>
          {c.icon}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p>{c.tip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function KpiChip({ label, value, growth }: { label: string; value: string; growth?: number | null }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-muted-foreground/60">{label}:</span>
      <span className="font-semibold text-foreground tabular-nums">{value}</span>
      {growth != null && (
        <span className={`font-semibold tabular-nums ${growth >= 0 ? "text-emerald-400" : "text-red-400"}`}>
          ({growth >= 0 ? "+" : ""}{growth}%)
        </span>
      )}
    </span>
  );
}

function ScoreGauge({
  label,
  value,
  color,
  tooltip,
}: {
  label: string;
  value: number;
  color: "blue" | "emerald";
  tooltip: string;
}) {
  const circumference = 2 * Math.PI * 14;
  const filled = (value / 10) * circumference;
  const strokeColor = color === "emerald" ? "stroke-emerald-500" : "stroke-blue-400";

  return (
    <Tooltip>
      <TooltipTrigger>
        <div className="flex items-center gap-1.5 cursor-help">
          <div className="relative h-8 w-8">
            <svg viewBox="0 0 36 36" className="h-8 w-8 -rotate-90">
              <circle cx="18" cy="18" r="14" fill="none" className="stroke-muted" strokeWidth="3" />
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                className={strokeColor}
                strokeWidth="3"
                strokeDasharray={`${filled} ${circumference}`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold tabular-nums">
              {value}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}
