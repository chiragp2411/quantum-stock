"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SessionNotebook } from "@/components/notes/session-notebook";
import { LYNCH_CATEGORIES, PHASE_CONFIG, TOOLTIPS } from "@/lib/constants";
import {
  ArrowLeft,
  FileText,
  Calculator,
  TrendingUp,
  TrendingDown,
  HelpCircle,
  Loader2,
  ArrowUpRight,
  ChevronRight,
  Building2,
} from "lucide-react";

export default function StockPage() {
  const params = useParams();
  const router = useRouter();
  const symbol = decodeURIComponent(params.symbol as string);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/api/stocks/${encodeURIComponent(symbol)}/summary`)
      .then((res) => { if (!cancelled) setData(res.data); })
      .catch(() => { if (!cancelled) router.push("/dashboard"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [symbol, router]);

  if (loading) {
    return (
      <>
        <Header />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      </>
    );
  }

  if (!data) return null;

  const stock = data.stock as Record<string, unknown>;
  const cleanSymbol = (stock.symbol as string)
    ?.replace(".NS", "")
    .replace(".BO", "");
  const cat =
    LYNCH_CATEGORIES[stock.lynch_category as keyof typeof LYNCH_CATEGORIES];
  const val = data.latest_valuation as Record<string, unknown> | null;
  const phase = val?.phase as string | undefined;
  const phaseConf = phase
    ? PHASE_CONFIG[phase as keyof typeof PHASE_CONFIG]
    : null;

  const currentPrice = stock.current_price as number;
  const low52 = stock.week_52_low as number;
  const high52 = stock.week_52_high as number;
  const pricePosition = low52 && high52 && high52 !== low52
    ? ((currentPrice - low52) / (high52 - low52)) * 100
    : 50;
  const epsGrowth = stock.eps_growth as number;
  const isPositiveGrowth = (epsGrowth ?? 0) > 0;

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
          <span className="font-medium text-foreground">{cleanSymbol}</span>
        </nav>

        {/* Stock header hero */}
        <div className="mb-8 rounded-xl border border-border/40 bg-card p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <Building2 className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">{cleanSymbol}</h1>
                  <p className="text-sm text-muted-foreground">
                    {stock.name as string} &middot; {stock.exchange as string} &middot; {stock.sector as string}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {cat && (
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant="outline" className={`text-xs px-2.5 py-0.5 font-medium ${cat.color}`}>
                        {stock.lynch_category as string}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="font-medium mb-1">{cat.analogy}</p>
                      <p className="text-xs text-muted-foreground">{cat.description}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {phaseConf && (
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant="outline" className={`text-xs px-2.5 py-0.5 font-medium ${phaseConf.bg} ${phaseConf.color} ${phaseConf.border}`}>
                        {phaseConf.shortLabel}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>{phaseConf.description}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>

            <div className="text-left sm:text-right space-y-1">
              <p className="text-3xl font-bold tabular-nums">
                ₹{currentPrice?.toLocaleString("en-IN")}
              </p>
              {epsGrowth != null && (
                <div className={`flex items-center gap-1 text-sm font-medium sm:justify-end ${isPositiveGrowth ? "text-emerald-500" : "text-red-400"}`}>
                  {isPositiveGrowth ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  {isPositiveGrowth ? "+" : ""}{epsGrowth?.toFixed(1)}% EPS Growth
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                MCap ₹{(stock.market_cap as number)?.toLocaleString("en-IN")} Cr
              </p>
            </div>
          </div>

          {/* 52-week range bar */}
          {low52 != null && high52 != null && (
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>52W Low ₹{low52?.toLocaleString("en-IN")}</span>
                <span>52W High ₹{high52?.toLocaleString("en-IN")}</span>
              </div>
              <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-red-400 via-amber-400 to-emerald-400 opacity-40"
                  style={{ width: "100%" }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-foreground border-2 border-background shadow-sm"
                  style={{ left: `clamp(4px, ${pricePosition}%, calc(100% - 4px))` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Key metrics row */}
        <div className="mb-8 grid gap-3 grid-cols-2 lg:grid-cols-4">
          <MetricCard label="PE Ratio" value={(stock.pe_ratio as number)?.toFixed(1)} tooltip={TOOLTIPS.pe} />
          <MetricCard label="EPS (TTM)" value={`₹${(stock.eps as number)?.toFixed(2)}`} />
          <MetricCard
            label="EPS Growth"
            value={`${(stock.eps_growth as number)?.toFixed(1)}%`}
            trend={(stock.eps_growth as number) > 0 ? "up" : "down"}
          />
          <MetricCard
            label="Market Cap"
            value={`₹${formatCompact(stock.market_cap as number)} Cr`}
          />
        </div>

        {/* Feature cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Link href={`/stock/${encodeURIComponent(symbol)}/concalls`}>
            <Card className="group cursor-pointer border-border/40 transition-all duration-200 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 h-full">
              <CardContent className="flex items-start gap-4 p-6">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <FileText className="h-5 w-5 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-base">Con-Call Deep Dive</h3>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-blue-400 transition-colors shrink-0" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Upload transcripts, analyze management guidance &amp; track execution
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-2.5 font-medium">
                    {data.concall_count as number} con-call{(data.concall_count as number) !== 1 ? "s" : ""} analyzed
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href={`/stock/${encodeURIComponent(symbol)}/valuation`}>
            <Card className="group cursor-pointer border-border/40 transition-all duration-200 hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5 h-full">
              <CardContent className="flex items-start gap-4 p-6">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <Calculator className="h-5 w-5 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-base">Forward Valuation</h3>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-amber-400 transition-colors shrink-0" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Scenario analysis with base/bull/bear cases &amp; growth-phase matrix
                  </p>
                  {phaseConf && (
                    <p className={`text-xs mt-2.5 font-medium ${phaseConf.color}`}>
                      Currently in {phaseConf.shortLabel} phase
                    </p>
                  )}
                  {!phaseConf && (
                    <p className="text-xs text-muted-foreground/60 mt-2.5 font-medium">Not yet calculated</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Session Notebook */}
        <div className="mt-8">
          <SessionNotebook symbol={symbol} />
        </div>
      </main>
    </>
  );
}

function MetricCard({
  label,
  value,
  tooltip,
  trend,
}: {
  label: string;
  value: string;
  tooltip?: string;
  trend?: "up" | "down";
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-card p-4 space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
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
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-lg font-bold tabular-nums">{value}</span>
        {trend === "up" && <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />}
        {trend === "down" && <TrendingDown className="h-3.5 w-3.5 text-red-400" />}
      </div>
    </div>
  );
}

function formatCompact(n: number): string {
  if (n == null) return "—";
  if (n >= 1_00_000) return `${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString("en-IN");
}
