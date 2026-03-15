"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { Header } from "@/components/layout/header";
import { ScenarioPanel } from "@/components/valuation/scenario-panel";
import { PhaseSpeedometer } from "@/components/valuation/phase-speedometer";
import { SensitivitySlider } from "@/components/valuation/sensitivity-slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Calculator, ChevronRight, HelpCircle, Loader2, Settings2, Sparkles, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
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
  const [guidancePrefill, setGuidancePrefill] = useState<{
    suggested_growth: number | null;
    source: string | null;
    trajectory: string | null;
    quarter: string | null;
  } | null>(null);

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

        if (prefillRes.status === "fulfilled" && prefillRes.value.data.suggested_growth) {
          setGuidancePrefill(prefillRes.value.data);
          if (!hasCalculated.current) {
            const g = Math.round(prefillRes.value.data.suggested_growth);
            if (g > 0 && g <= 200) setGrowthRate(g);
          }
        } else if (
          stockRes.status === "fulfilled" &&
          stockRes.value.data.eps_growth &&
          !hasCalculated.current
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
    debounceRef.current = setTimeout(() => {
      calculate(true);
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [growthRate, bullDelta, bearDelta, calculate, initialLoading]);

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
          <span className="font-medium text-foreground">Valuation</span>
        </nav>

        {/* Page header */}
        <div className="mb-8 flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
            <Calculator className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              Forward Valuation — {cleanSymbol}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              PEG-based valuation with growth from con-call guidance. PEG &lt; 1 = undervalued, PEG &gt; 1.5 = expensive.
            </p>
          </div>
        </div>

        {initialLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            <p className="text-sm text-muted-foreground">Loading valuation data...</p>
          </div>
        ) : (
          <>
            {/* Phase speedometer — prominently at the top */}
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
                      Adjust parameters below and calculate to see the phase matrix
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Guidance auto-fill hint */}
            {guidancePrefill?.suggested_growth != null && (
              <div className="mb-4 rounded-xl border border-emerald-500/15 bg-emerald-500/5 px-4 py-3 flex items-center gap-3">
                <Sparkles className="h-4 w-4 text-emerald-400 shrink-0" />
                <div className="flex-1 text-sm">
                  <span className="text-muted-foreground">Growth rate auto-filled from </span>
                  <span className="font-medium text-foreground">{guidancePrefill.quarter}</span>
                  <span className="text-muted-foreground"> con-call guidance ({guidancePrefill.source?.replace(/_/g, " ")}): </span>
                  <span className="font-semibold text-emerald-400">{guidancePrefill.suggested_growth}%</span>
                  {guidancePrefill.trajectory && (
                    <span className="ml-2 inline-flex items-center gap-1">
                      {guidancePrefill.trajectory === "up" && <TrendingUp className="h-3 w-3 text-emerald-400" />}
                      {guidancePrefill.trajectory === "down" && <TrendingDown className="h-3 w-3 text-red-400" />}
                      {guidancePrefill.trajectory === "flat" && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                      <span className={`text-xs font-medium ${
                        guidancePrefill.trajectory === "up" ? "text-emerald-400" : guidancePrefill.trajectory === "down" ? "text-red-400" : "text-muted-foreground"
                      }`}>
                        {guidancePrefill.trajectory.charAt(0).toUpperCase() + guidancePrefill.trajectory.slice(1)} trajectory
                      </span>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="grid gap-6 lg:grid-cols-2 mb-8">
              <SensitivitySlider
                growthRate={growthRate}
                bullDelta={bullDelta}
                bearDelta={bearDelta}
                onGrowthChange={setGrowthRate}
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
                          If yfinance can&apos;t fetch the latest EPS or price, enter them here manually.
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
                        placeholder="Auto-fetched"
                        value={manualEps}
                        onChange={(e) => setManualEps(e.target.value)}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Current Price (₹)</Label>
                      <Input
                        type="number"
                        placeholder="Auto-fetched"
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
                      <span>PE {result.current_pe.toFixed(1)}</span>
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
                  <h3 className="text-lg font-semibold">Scenario Analysis</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Three scenarios based on management guidance. Fair Value = EPS &times; Growth Rate (Lynch formula). PEG &lt; 1 is Phase 1 (Bargain), PEG &gt; 1.5 with low growth is Phase 3 (Trap).
                  </p>
                </div>
                <ScenarioPanel
                  base={result.base}
                  bull={result.bull}
                  bear={result.bear}
                  currentPrice={result.current_price}
                />
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
