"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { Header } from "@/components/layout/header";
import { useAuth } from "@/hooks/use-auth";
import { PdfDropzone } from "@/components/concalls/pdf-dropzone";
import { AnalysisCard } from "@/components/concalls/analysis-card";
import { TrackerTable } from "@/components/concalls/tracker-table";
import { GuidanceTrendChart } from "@/components/concalls/guidance-trend-chart";
import { GuidanceVsActualsChart } from "@/components/concalls/guidance-vs-actuals-chart";
import { FinancialKpiChart } from "@/components/concalls/financial-kpi-chart";
import { CredibilityBadge } from "@/components/concalls/credibility-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, ChevronRight, FileText, Loader2, BarChart3, Trash2, IndianRupee } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Concall {
  _id: string;
  quarter: string;
  pdf_filename: string;
  status?: string;
  analysis: {
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
  } | null;
  uploaded_at: string;
}

interface TrackerRow {
  period: string;
  prev_guidance: Record<string, string>;
  actuals: Record<string, string>;
  met_missed: string;
  reasons: string;
  new_guidance: Record<string, string>;
  trajectory: string;
  surprise?: string | null;
  contradictions?: string[];
  tone_score?: number;
}

export default function ConcallsPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const symbol = decodeURIComponent(params.symbol as string);
  const cleanSymbol = symbol.replace(".NS", "").replace(".BO", "");

  const [concalls, setConcalls] = useState<Concall[]>([]);
  const [tracker, setTracker] = useState<TrackerRow[]>([]);
  const [credibility, setCredibility] = useState<{ hit_rate_pct: number | null; quarters_tracked: number; quarters_met: number } | null>(null);
  const [financialTs, setFinancialTs] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [concallRes, trackerRes] = await Promise.all([
        api.get(`/api/concalls/${encodeURIComponent(symbol)}`),
        api.get(`/api/concalls/${encodeURIComponent(symbol)}/tracker`),
      ]);
      setConcalls(concallRes.data);
      setTracker(trackerRes.data.tracker || []);
      setCredibility(trackerRes.data.credibility || null);
      setFinancialTs(trackerRes.data.financial_timeseries || []);
      return concallRes.data as Concall[];
    } catch {
      return [] as Concall[];
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await loadData();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  const hasInProgress = concalls.some(
    (c) => c.status === "queued" || c.status === "analyzing"
  );

  useEffect(() => {
    if (hasInProgress) {
      setAnalyzing(true);
      if (!pollRef.current) {
        pollRef.current = setInterval(async () => {
          const data = await loadData();
          const stillActive = data.some(
            (c: Concall) => c.status === "queued" || c.status === "analyzing"
          );
          if (!stillActive) {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
            setAnalyzing(false);
            toast.success("Analysis complete");
          }
        }, 4000);
      }
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [hasInProgress, loadData]);

  const handleAnalyzeAll = async () => {
    setAnalyzing(true);
    try {
      await api.post(`/api/concalls/${encodeURIComponent(symbol)}/analyze`);
      toast.info("Analysis started in background");
      await loadData();
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : "Could not start analysis";
      toast.error(msg || "Could not start analysis");
      setAnalyzing(false);
    }
  };

  const handleDeleteConcall = async (concallId: string) => {
    try {
      await api.delete(`/api/concalls/${encodeURIComponent(symbol)}/${concallId}`);
      toast.success("Con-call deleted");
      await loadData();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleClearByStatus = async (filterStatus: string) => {
    try {
      await api.delete(`/api/concalls/${encodeURIComponent(symbol)}/clear?filter_status=${filterStatus}`);
      toast.success(filterStatus === "all" ? "All con-calls cleared" : `${filterStatus} con-calls cleared`);
      await loadData();
    } catch {
      toast.error("Failed to clear");
    }
  };

  const pendingCount = concalls.filter((c) => !c.analysis && c.status !== "queued" && c.status !== "analyzing").length;
  const failedCount = concalls.filter((c) => c.status === "failed" || (c.analysis?.error)).length;
  const activeCount = concalls.filter((c) => c.status === "queued" || c.status === "analyzing").length;
  const completedCount = concalls.filter((c) => c.status === "completed" || (c.analysis && !c.analysis.error && c.status !== "failed")).length;

  const concallIds = concalls.reduce((acc, c) => {
    const q = c.analysis?.quarter || c.quarter;
    if (q) acc[q] = c._id;
    return acc;
  }, {} as Record<string, string>);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <nav className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
          <button onClick={() => router.push("/dashboard")} className="hover:text-foreground transition-colors">
            Dashboard
          </button>
          <ChevronRight className="h-3.5 w-3.5" />
          <button onClick={() => router.push(`/stock/${encodeURIComponent(symbol)}`)} className="hover:text-foreground transition-colors">
            {cleanSymbol}
          </button>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">Con-Call Analysis</span>
        </nav>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20">
              <FileText className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Con-Call Deep Dive</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Upload earnings call transcripts and let AI analyze management guidance, tone, and execution
              </p>
              {credibility && credibility.hit_rate_pct != null && (
                <div className="mt-2">
                  <CredibilityBadge
                    hitRatePct={credibility.hit_rate_pct}
                    quartersTracked={credibility.quarters_tracked}
                    quartersMet={credibility.quarters_met}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isAuthenticated && concalls.length > 0 && (pendingCount > 0 || activeCount > 0) && (
              <Button
                onClick={handleAnalyzeAll}
                disabled={analyzing}
                className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 font-medium"
              >
                {analyzing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Brain className="h-4 w-4" />
                )}
                {analyzing
                  ? `Analyzing ${activeCount}...`
                  : `Analyze ${pendingCount} Pending`}
              </Button>
            )}

            {isAuthenticated && concalls.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="outline" size="sm" className="gap-1.5" />}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {failedCount > 0 && (
                    <DropdownMenuItem onClick={() => handleClearByStatus("failed")}>
                      Clear {failedCount} failed
                    </DropdownMenuItem>
                  )}
                  {pendingCount > 0 && (
                    <DropdownMenuItem onClick={() => handleClearByStatus("pending")}>
                      Clear {pendingCount} pending
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => handleClearByStatus("all")}
                    className="text-red-500 focus:text-red-500"
                  >
                    Clear all ({concalls.length})
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {isAuthenticated && (
          <div className="mb-8">
            <PdfDropzone symbol={symbol} onUploadComplete={loadData} />
          </div>
        )}

        {!isAuthenticated && (
          <div className="mb-8 rounded-xl border border-dashed border-border/60 bg-card/30 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              <a href="/login" className="text-emerald-500 hover:underline font-medium">Sign in</a> to upload and analyze con-call transcripts
            </p>
          </div>
        )}

        {/* Analysis progress bar */}
        {analyzing && activeCount > 0 && (
          <div className="mb-6 rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4">
            <div className="flex items-center gap-2.5 mb-2">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
              <span className="text-sm font-medium text-foreground">
                Analyzing con-calls...
              </span>
            </div>
            <div className="flex gap-1.5">
              {concalls.map((c) => {
                const s = c.status || (c.analysis ? "completed" : "pending");
                let bg = "bg-muted";
                if (s === "completed") bg = "bg-emerald-500";
                else if (s === "analyzing") bg = "bg-emerald-500 animate-pulse";
                else if (s === "queued") bg = "bg-blue-400/50";
                else if (s === "failed") bg = "bg-red-400";
                return <div key={c._id} className={`h-2 flex-1 rounded-full ${bg}`} />;
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {completedCount} completed, {activeCount} in progress, {pendingCount} pending
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            <p className="text-sm text-muted-foreground">Loading con-call data...</p>
          </div>
        ) : concalls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50 mb-4">
              <FileText className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground font-medium">No con-calls uploaded yet</p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              Drop earnings call PDFs above to begin the analysis
            </p>
          </div>
        ) : (
          <Tabs defaultValue="analysis" className="space-y-6">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="analysis" className="gap-1.5 data-[state=active]:bg-background">
                <Brain className="h-3.5 w-3.5" />
                Analysis ({completedCount}/{concalls.length})
              </TabsTrigger>
              <TabsTrigger value="tracker" className="gap-1.5 data-[state=active]:bg-background">
                <FileText className="h-3.5 w-3.5" />
                Guidance Tracker
              </TabsTrigger>
              <TabsTrigger value="financials" className="gap-1.5 data-[state=active]:bg-background">
                <IndianRupee className="h-3.5 w-3.5" />
                Financials
              </TabsTrigger>
              <TabsTrigger value="charts" className="gap-1.5 data-[state=active]:bg-background">
                <BarChart3 className="h-3.5 w-3.5" />
                Charts
              </TabsTrigger>
            </TabsList>

            <TabsContent value="analysis" className="space-y-4">
              <p className="text-xs text-muted-foreground -mt-2 mb-2">
                Click on any analyzed con-call to see the full AI research note with summary, guidance, business model, thesis, and more.
              </p>
              {concalls.map((c) => (
                <AnalysisCard
                  key={c._id}
                  symbol={symbol}
                  concall={c}
                  onReanalyzed={loadData}
                  onDelete={handleDeleteConcall}
                />
              ))}
            </TabsContent>

            <TabsContent value="tracker">
              <p className="text-xs text-muted-foreground mb-3">
                Track whether management delivers on their promises. Green = guidance met, Red = guidance missed. The trajectory shows if guidance is being revised up or down over time.
              </p>
              <TrackerTable
                symbol={symbol}
                tracker={tracker}
                concallIds={concallIds}
                onRefresh={loadData}
              />
            </TabsContent>

            <TabsContent value="financials">
              <p className="text-xs text-muted-foreground mb-3">
                Quarter-over-quarter financial KPIs extracted from analyzed con-calls. Helps you spot growth trends and margin expansion/compression.
              </p>
              <FinancialKpiChart data={financialTs as Record<string, unknown>[]} />
            </TabsContent>

            <TabsContent value="charts" className="space-y-4">
              <p className="text-xs text-muted-foreground -mt-2 mb-2">
                Tone score measures management confidence and transparency (1-10). Execution score tracks how well they deliver on past promises (1-10).
              </p>
              <div className="grid gap-4 lg:grid-cols-2">
                <GuidanceTrendChart concalls={concalls} />
                <GuidanceVsActualsChart tracker={tracker} />
              </div>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </>
  );
}
