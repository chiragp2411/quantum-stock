"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { Header } from "@/components/layout/header";
import { ScenarioPanel } from "@/components/valuation/scenario-panel";
import { PhaseSpeedometer } from "@/components/valuation/phase-speedometer";
import { SensitivitySlider } from "@/components/valuation/sensitivity-slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Calculator,
  ChevronRight,
  HelpCircle,
  Loader2,
  Settings2,
  Sparkles,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  FileText,
  AlertTriangle,
  Info,
  ExternalLink,
  Calendar,
  Target,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

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

interface ValuationResult {
  symbol: string;
  current_price: number;
  current_eps: number;
  current_pe: number;
  base: Scenario;
  bull: Scenario;
  bear: Scenario;
  overall_phase: string;
  overall_phase_label: string;
}

interface GuidancePrefill {
  suggested_growth: number | null;
  source: string | null;
  source_label: string | null;
  source_raw_value: string | null;
  trajectory: string | null;
  trajectory_detail: string | null;
  quarter: string | null;
  forward_period: string | null;
  concall_filename: string | null;
  analyzed_at: string | null;
  full_guidance: Record<string, string>;
  financials_extracted: Record<string, number>;
  tone_score: number | null;
  execution_score: number | null;
  assumptions: string[];
  total_concalls_analyzed: number;
}

export default function ValuationPage() {
  const params = useParams();
  const router = useRouter();
  const symbol = decodeURIComponent(params.symbol as string);
  const cleanSymbol = symbol.replace(".NS", "").replace(".BO", "");

  const [result, setResult] = useState<ValuationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [growthRate, setGrowthRate] = useState(20);
  const [bullDelta, setBullDelta] = useState(10);
  const [bearDelta, setBearDelta] = useState(10);
  const [manualEps, setManualEps] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [prefill, setPrefill] = useState<GuidancePrefill | null>(null);
  const [growthOverridden, setGrowthOverridden] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasCalculated = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const loadInitial = async () => {
      try {
        const [latestRes, stockRes, prefillRes] = await Promise.allSettled([
          api.get(`/api/valuation/${encodeURIComponent(symbol)}/latest`),
          api.get(`/api/stocks/${encodeURIComponent(symbol)}/summary`),
          api.get(`/api/valuation/${encodeURIComponent(symbol)}/guidance-prefill`),
        ]);
        if (cancelled) return;

        if (latestRes.status === "fulfilled" && latestRes.value.data.scenarios) {
          const scenarios = latestRes.value.data.scenarios;
          setResult(scenarios);
          setGrowthRate(scenarios.base.growth_rate);
          hasCalculated.current = true;
        }

        if (prefillRes.status === "fulfilled") {
          const pf = prefillRes.value.data as GuidancePrefill;
          setPrefill(pf);
          if (pf.suggested_growth && !hasCalculated.current) {
            const g = Math.round(pf.suggested_growth);
            if (g > 0 && g <= 200) setGrowthRate(g);
          }
        }

        if (
          !hasCalculated.current &&
          !(prefillRes.status === "fulfilled" && prefillRes.value.data.suggested_growth) &&
          stockRes.status === "fulfilled" &&
          stockRes.value.data.eps_growth
        ) {
          const g = Math.round(Math.abs(stockRes.value.data.eps_growth));
          if (g > 0 && g <= 100) setGrowthRate(g);
        }
      } catch {
        /* nothing to load yet */
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    };
    loadInitial();
    return () => { cancelled = true; };
  }, [symbol]);

  const calculate = useCallback(
    async (silent = false) => {
      setLoading(true);
      try {
        const res = await api.post(
          `/api/valuation/${encodeURIComponent(symbol)}/calculate`,
          {
            growth_rate: growthRate,
            bull_delta: bullDelta,
            bear_delta: bearDelta,
            current_eps: manualEps ? parseFloat(manualEps) : null,
            current_price: manualPrice ? parseFloat(manualPrice) : null,
          }
        );
        setResult(res.data);
        hasCalculated.current = true;
        if (!silent) toast.success("Valuation calculated");
      } catch {
        if (!silent) {
          toast.error(
            "Calculation failed — provide EPS and Price manually if stock data is unavailable."
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [symbol, growthRate, bullDelta, bearDelta, manualEps, manualPrice]
  );

  useEffect(() => {
    if (!hasCalculated.current || initialLoading) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { calculate(true); }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [growthRate, bullDelta, bearDelta, calculate, initialLoading]);

  const handleGrowthChange = (val: number) => {
    setGrowthRate(val);
    if (prefill?.suggested_growth && val !== Math.round(prefill.suggested_growth)) {
      setGrowthOverridden(true);
    } else {
      setGrowthOverridden(false);
    }
  };

  const forwardPeriod = prefill?.forward_period || "Next FY";
  const hasGuidance = prefill && Object.keys(prefill.full_guidance).length > 0;
  const hasAssumptions = prefill && prefill.assumptions.length > 0;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
          <button onClick={() => router.push("/dashboard")} className="hover:text-foreground transition-colors">
            Dashboard
          </button>
          <ChevronRight className="h-3.5 w-3.5" />
          <button onClick={() => router.push(`/stock/${encodeURIComponent(symbol)}`)} className="hover:text-foreground transition-colors">
            {cleanSymbol}
          </button>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">Forward Valuation</span>
        </nav>

        {/* Page header with forward period */}
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Calculator className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                Forward Valuation — {cleanSymbol}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                PEG-based forward valuation using management&apos;s own guidance from con-call transcripts
              </p>
            </div>
          </div>
          {prefill?.quarter && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-semibold gap-1.5 px-3 py-1.5 bg-amber-500/5 text-amber-500 border-amber-500/20">
                <Calendar className="h-3 w-3" />
                Valuation for {forwardPeriod}
              </Badge>
              <Badge variant="outline" className="text-xs gap-1.5 px-3 py-1.5">
                <FileText className="h-3 w-3" />
                Based on {prefill.quarter} Con-Call
              </Badge>
            </div>
          )}
        </div>

        {initialLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            <p className="text-sm text-muted-foreground">Loading valuation data...</p>
          </div>
        ) : (
          <>
            {/* === GUIDANCE SOURCE & TRANSPARENCY SECTION === */}
            <div className="mb-8 space-y-4">

              {/* Assumptions / Warnings */}
              {hasAssumptions && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="space-y-1.5">
                      <span className="text-xs font-semibold text-amber-500 uppercase tracking-wide">Assumptions & Disclosures</span>
                      {prefill!.assumptions.map((a, i) => (
                        <p key={i} className="text-sm text-muted-foreground leading-relaxed">{a}</p>
                      ))}
                      {growthOverridden && (
                        <p className="text-sm text-blue-400">
                          You have manually overridden the growth rate from {prefill?.suggested_growth}% to {growthRate}%.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Guidance Source Card */}
              {prefill && (
                <Card className="border-border/40">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Eye className="h-4 w-4 text-emerald-500" />
                          Data Source & Transparency
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                          Exactly how the growth rate was determined — every number is traceable to its source
                        </CardDescription>
                      </div>
                      {prefill.quarter && (
                        <Link href={`/stock/${encodeURIComponent(symbol)}/concalls`}>
                          <Button variant="outline" size="sm" className="text-xs gap-1.5">
                            <ExternalLink className="h-3 w-3" />
                            View Con-Call
                          </Button>
                        </Link>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Source concall info */}
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <InfoBlock
                        label="Source Con-Call"
                        value={prefill.quarter || "None"}
                        sub={prefill.concall_filename || undefined}
                      />
                      <InfoBlock
                        label="Forward Period"
                        value={forwardPeriod}
                        sub="Valuation is calculated for this fiscal year"
                      />
                      <InfoBlock
                        label="Growth Rate Used"
                        value={`${growthRate}%`}
                        sub={
                          growthOverridden
                            ? `Manually set (guidance was ${prefill.suggested_growth}%)`
                            : prefill.source_label || "Default (20%)"
                        }
                        highlight={growthOverridden ? "blue" : prefill.suggested_growth ? "emerald" : "amber"}
                      />
                      <InfoBlock
                        label="Trajectory"
                        value={
                          prefill.trajectory
                            ? prefill.trajectory.charAt(0).toUpperCase() + prefill.trajectory.slice(1)
                            : "N/A"
                        }
                        sub={prefill.trajectory_detail || "Guidance revision direction vs previous quarter"}
                        highlight={
                          prefill.trajectory === "up" ? "emerald" : prefill.trajectory === "down" ? "red" : undefined
                        }
                      />
                    </div>

                    {/* Management's exact guidance */}
                    {hasGuidance && (
                      <div className="pt-3 border-t border-border/30">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <Target className="h-3 w-3" />
                          Management&apos;s Exact Forward Guidance ({prefill.quarter})
                        </h4>
                        <p className="text-[11px] text-muted-foreground/60 mb-3">
                          These are the specific numbers management guided for in the earnings call. The highlighted row is what was used for the growth rate.
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {Object.entries(prefill.full_guidance).map(([key, val]) => {
                            const isUsed = key === prefill.source;
                            return (
                              <div
                                key={key}
                                className={`rounded-lg border px-3 py-2 text-sm ${
                                  isUsed
                                    ? "border-emerald-500/30 bg-emerald-500/5"
                                    : "border-border/30 bg-muted/20"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs text-muted-foreground capitalize">
                                    {key.replace(/_/g, " ")}
                                  </span>
                                  {isUsed && (
                                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                                      USED
                                    </Badge>
                                  )}
                                </div>
                                <p className={`text-sm font-medium mt-0.5 ${isUsed ? "text-emerald-400" : "text-foreground"}`}>
                                  {val}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Extracted financials from the concall */}
                    {prefill.financials_extracted && Object.keys(prefill.financials_extracted).length > 0 && (
                      <div className="pt-3 border-t border-border/30">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <Info className="h-3 w-3" />
                          Reported Financials ({prefill.quarter})
                        </h4>
                        <p className="text-[11px] text-muted-foreground/60 mb-3">
                          Actual numbers reported by management for the quarter — these are backward-looking, not forward guidance.
                        </p>
                        <div className="flex flex-wrap gap-3">
                          {Object.entries(prefill.financials_extracted).map(([key, val]) => (
                            <div key={key} className="rounded-lg border border-border/30 bg-muted/20 px-3 py-1.5">
                              <span className="text-[10px] text-muted-foreground capitalize block">
                                {key.replace(/_/g, " ").replace(" cr", " (₹ cr)").replace(" pct", " %")}
                              </span>
                              <span className="text-sm font-semibold tabular-nums">
                                {typeof val === "number" ? (key.includes("pct") ? `${val.toFixed(1)}%` : `₹${val.toLocaleString("en-IN")} cr`) : val}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Confidence scores */}
                    {(prefill.tone_score || prefill.execution_score) && (
                      <div className="pt-3 border-t border-border/30 flex gap-4">
                        {prefill.tone_score != null && (
                          <div className="text-xs">
                            <span className="text-muted-foreground">Management Tone: </span>
                            <span className={`font-semibold ${
                              prefill.tone_score >= 7 ? "text-emerald-500" : prefill.tone_score >= 4 ? "text-blue-400" : "text-red-400"
                            }`}>
                              {prefill.tone_score}/10
                            </span>
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="h-3 w-3 text-muted-foreground/50 ml-1 inline cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>How confident and transparent management sounds in the con-call (1=evasive, 10=very open and data-driven)</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        )}
                        {prefill.execution_score != null && (
                          <div className="text-xs">
                            <span className="text-muted-foreground">Execution Track Record: </span>
                            <span className={`font-semibold ${
                              prefill.execution_score >= 7 ? "text-emerald-500" : prefill.execution_score >= 4 ? "text-blue-400" : "text-red-400"
                            }`}>
                              {prefill.execution_score}/10
                            </span>
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="h-3 w-3 text-muted-foreground/50 ml-1 inline cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>How well management has delivered on past promises — based on guidance vs actuals comparison (1=frequently misses, 10=consistently delivers)</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* No concall data warning */}
              {prefill && !prefill.quarter && (
                <div className="rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 p-6 text-center">
                  <AlertTriangle className="h-8 w-8 text-amber-400/50 mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground">No Con-Call Data Available</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                    Upload and analyze at least one earnings call transcript to get management guidance for valuation.
                    Without guidance, the growth rate defaults to 20% — which is just a placeholder.
                  </p>
                  <Link href={`/stock/${encodeURIComponent(symbol)}/concalls`}>
                    <Button variant="outline" size="sm" className="mt-4 gap-1.5 text-xs">
                      <FileText className="h-3 w-3" />
                      Upload Con-Call
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Phase speedometer */}
            <div className="mb-8">
              {result ? (
                <PhaseSpeedometer
                  currentPhase={result.overall_phase}
                  peg={result.base.peg}
                  growthRate={result.base.growth_rate}
                />
              ) : (
                <Card className="border-dashed border-border/50">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50 mb-4">
                      <Calculator className="h-7 w-7 text-muted-foreground/50" />
                    </div>
                    <p className="text-muted-foreground font-medium">No valuation calculated yet</p>
                    <p className="text-sm text-muted-foreground/60 mt-1">
                      Adjust parameters below and click Calculate
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Controls */}
            <div className="grid gap-6 lg:grid-cols-2 mb-8">
              <SensitivitySlider
                growthRate={growthRate}
                bullDelta={bullDelta}
                bearDelta={bearDelta}
                onGrowthChange={handleGrowthChange}
                onBullDeltaChange={setBullDelta}
                onBearDeltaChange={setBearDelta}
              />

              <Card className="border-border/40">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-muted-foreground" />
                    Manual Overrides
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>
                          EPS and Price are auto-fetched from Yahoo Finance. Override here if the data is stale or unavailable.
                          The growth rate slider above uses con-call guidance — you can override that too.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Current EPS (₹)</Label>
                      <Input
                        type="number"
                        placeholder="Auto-fetched from Yahoo Finance"
                        value={manualEps}
                        onChange={(e) => setManualEps(e.target.value)}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Current Price (₹)</Label>
                      <Input
                        type="number"
                        placeholder="Auto-fetched from Yahoo Finance"
                        value={manualPrice}
                        onChange={(e) => setManualPrice(e.target.value)}
                        className="h-10"
                      />
                    </div>
                  </div>

                  {result && (
                    <div className="flex items-center gap-4 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2.5">
                      <span>CMP ₹{result.current_price.toLocaleString("en-IN")}</span>
                      <span>EPS ₹{result.current_eps}</span>
                      <span>Trailing PE {result.current_pe.toFixed(1)}</span>
                      <span className="text-muted-foreground/50">|</span>
                      <span>Source: Yahoo Finance</span>
                      {loading && <Loader2 className="h-3 w-3 animate-spin ml-auto" />}
                    </div>
                  )}

                  <Button
                    onClick={() => calculate(false)}
                    className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Calculator className="mr-2 h-4 w-4" />
                    )}
                    {hasCalculated.current ? "Recalculate" : "Calculate Valuation"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Scenario results */}
            {result && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-semibold">
                    Scenario Analysis — {forwardPeriod}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
                    Three scenarios using {growthRate}% as the base growth rate
                    {prefill?.source_label ? ` (from ${prefill.source_label})` : ""}.
                    Fair Value = EPS &times; Growth Rate (Lynch formula).
                    PEG &lt; 1 = Phase 1 (Bargain: stock is undervalued for its growth).
                    PEG &gt; 1.5 with low growth = Phase 3 (Trap: expensive with no growth to justify it).
                  </p>
                </div>
                <ScenarioPanel
                  base={result.base}
                  bull={result.bull}
                  bear={result.bear}
                  currentPrice={result.current_price}
                />

                {/* Methodology footer */}
                <div className="rounded-lg border border-border/30 bg-muted/10 px-4 py-3 mt-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">How this valuation works</h4>
                  <div className="grid gap-2 sm:grid-cols-2 text-xs text-muted-foreground leading-relaxed">
                    <div>
                      <p><span className="font-medium text-foreground">Forward EPS</span> = Current EPS &times; (1 + Growth Rate)</p>
                      <p><span className="font-medium text-foreground">Forward P/E</span> = Current Price &divide; Forward EPS</p>
                      <p><span className="font-medium text-foreground">PEG</span> = Forward P/E &divide; Growth Rate (%)</p>
                    </div>
                    <div>
                      <p><span className="font-medium text-foreground">Fair Value</span> = Current EPS &times; Growth Rate (Lynch: P/E should equal growth)</p>
                      <p><span className="font-medium text-foreground">Upside</span> = (Fair Value - Current Price) &divide; Current Price &times; 100</p>
                      <p><span className="font-medium text-foreground">Bull/Bear</span> = Base growth &plusmn; delta (default &plusmn;10%)</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}

function InfoBlock({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: "emerald" | "red" | "blue" | "amber";
}) {
  const colorMap = {
    emerald: "text-emerald-500",
    red: "text-red-400",
    blue: "text-blue-400",
    amber: "text-amber-400",
  };
  return (
    <div className="rounded-lg border border-border/30 bg-muted/20 px-3 py-2.5">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">{label}</span>
      <p className={`text-sm font-bold mt-0.5 ${highlight ? colorMap[highlight] : "text-foreground"}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground/60 mt-0.5 leading-snug">{sub}</p>}
    </div>
  );
}
