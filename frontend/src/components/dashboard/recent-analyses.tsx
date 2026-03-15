"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
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
import { LYNCH_CATEGORIES, PHASE_CONFIG } from "@/lib/constants";
import {
  TrendingUp,
  FileText,
  ArrowUpRight,
} from "lucide-react";

interface RecentStock {
  _id: string;
  symbol: string;
  name: string;
  current_price: number;
  pe_ratio: number;
  eps_growth: number;
  lynch_category: string;
  concall_count: number;
  latest_phase: string | null;
  market_cap: number;
}

export function RecentAnalyses() {
  const [stocks, setStocks] = useState<RecentStock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/api/stocks/recent")
      .then((res) => { if (!cancelled) setStocks(res.data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-xl border border-border/40 p-5 space-y-4">
            <div className="flex justify-between">
              <div className="h-5 w-20 rounded bg-muted" />
              <div className="h-5 w-5 rounded bg-muted" />
            </div>
            <div className="h-3 w-32 rounded bg-muted" />
            <div className="h-8 w-24 rounded bg-muted" />
            <div className="flex gap-2">
              <div className="h-5 w-20 rounded-full bg-muted" />
              <div className="h-5 w-16 rounded-full bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (stocks.length === 0) {
    return (
      <Card className="border-dashed border-border/60">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50 mb-4">
            <TrendingUp className="h-7 w-7 text-muted-foreground/50" />
          </div>
          <p className="text-muted-foreground text-center font-medium">
            No stocks analyzed yet
          </p>
          <p className="text-sm text-muted-foreground/60 text-center mt-1">
            Search for a symbol above to begin your research
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {stocks.map((s) => {
        const cat =
          LYNCH_CATEGORIES[s.lynch_category as keyof typeof LYNCH_CATEGORIES];
        const phaseConf = s.latest_phase
          ? PHASE_CONFIG[s.latest_phase as keyof typeof PHASE_CONFIG]
          : null;
        const cleanSymbol = s.symbol.replace(".NS", "").replace(".BO", "");
        const isPositiveGrowth = (s.eps_growth ?? 0) > 0;

        return (
          <Link key={s._id} href={`/stock/${encodeURIComponent(s.symbol)}`}>
            <Card className="group relative border-border/40 transition-all duration-200 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 cursor-pointer overflow-hidden">
              <CardContent className="p-5 space-y-4">
                {/* Header row */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold tracking-tight">{cleanSymbol}</h3>
                    <p className="text-xs text-muted-foreground truncate max-w-[180px]">{s.name}</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-emerald-500 transition-colors shrink-0" />
                </div>

                {/* Price and PE */}
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold tabular-nums">
                    ₹{s.current_price?.toLocaleString("en-IN")}
                  </span>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground">PE </span>
                    <span className="text-sm font-medium tabular-nums">{s.pe_ratio?.toFixed(1)}</span>
                  </div>
                </div>

                {/* Growth indicator */}
                {s.eps_growth != null && (
                  <div className={`flex items-center gap-1 text-xs font-medium ${isPositiveGrowth ? "text-emerald-500" : "text-red-400"}`}>
                    <TrendingUp className={`h-3 w-3 ${!isPositiveGrowth ? "rotate-180" : ""}`} />
                    {isPositiveGrowth ? "+" : ""}{s.eps_growth?.toFixed(1)}% EPS growth
                  </div>
                )}

                {/* Badges */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {cat && (
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-medium ${cat.color}`}>
                          {s.lynch_category}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="font-medium">{cat.analogy}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {phaseConf && (
                    <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-medium ${phaseConf.bg} ${phaseConf.color} ${phaseConf.border}`}>
                      {phaseConf.shortLabel}
                    </Badge>
                  )}
                </div>

                {/* Footer meta */}
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60 pt-1 border-t border-border/30">
                  <FileText className="h-3 w-3" />
                  {s.concall_count} con-call{s.concall_count !== 1 ? "s" : ""} analyzed
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
