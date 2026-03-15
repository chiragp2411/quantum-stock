"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { StockSearch } from "@/components/dashboard/stock-search";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import api from "@/lib/api";
import {
  BarChart3,
  FileText,
  TrendingUp,
  Building2,
  Layers,
  Target,
  Compass,
  ArrowUpRight,
  Activity,
  Sparkles,
  Zap,
  Search,
  LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardStats {
  total_stocks: number;
  total_concalls: number;
  analyzed_concalls: number;
  total_valuations: number;
  sectors: string[];
  sector_count: number;
  bargains: number;
  recent_activity: { symbol: string; quarter: string; analyzed_at: string | null }[];
}

export default function DashboardPage() {
  const { username, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.get("/api/stocks/dashboard-stats").then((r) => { if (!cancelled) setStats(r.data); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const hasData = stats && stats.total_stocks > 0;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Hero section */}
        <div className="mb-10 space-y-6">
          <div className="space-y-1">
            {isAuthenticated ? (
              <>
                <h2 className="text-2xl font-bold tracking-tight">
                  {greeting()}, {username}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Your equity research command center
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <Sparkles className="h-5 w-5 text-emerald-500" />
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight">
                    Welcome to Quantum<span className="text-emerald-500">Stock</span>
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground max-w-lg">
                  AI-powered equity research for Indian markets. Explore tracked stocks,
                  view analysis results, and discover opportunities — sign in to run your own analyses.
                </p>
              </>
            )}
          </div>

          {isAuthenticated ? (
            <div className="max-w-2xl">
              <StockSearch />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium gap-2">
                  <LogIn className="h-4 w-4" />
                  Sign in to analyze
                </Button>
              </Link>
              <Link href="/explore">
                <Button variant="outline" className="gap-2 font-medium">
                  <Search className="h-4 w-4" />
                  Explore stocks
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-8">
          <Link href="/explore">
            <StatCard
              icon={Building2}
              label="Stocks Tracked"
              subtitle="Click to explore all"
              value={stats?.total_stocks ?? 0}
              color="text-emerald-500"
              bg="bg-emerald-500/10 border-emerald-500/20"
              clickable
            />
          </Link>
          <Link href="/explore">
            <StatCard
              icon={FileText}
              label="Con-Calls Analyzed"
              subtitle="Click to explore stocks"
              value={stats?.analyzed_concalls ?? 0}
              color="text-blue-500"
              bg="bg-blue-500/10 border-blue-500/20"
              clickable
            />
          </Link>
          <Link href="/explore">
            <StatCard
              icon={Layers}
              label="Sectors Covered"
              subtitle="Click to browse sectors"
              value={stats?.sector_count ?? 0}
              color="text-purple-500"
              bg="bg-purple-500/10 border-purple-500/20"
              clickable
            />
          </Link>
          <Link href="/explore?sort_by=eps_growth&sort_order=desc">
            <StatCard
              icon={Target}
              label="Bargain Opportunities"
              subtitle="Stocks with PEG < 1 + high growth"
              value={stats?.bargains ?? 0}
              color="text-amber-500"
              bg="bg-amber-500/10 border-amber-500/20"
              clickable
            />
          </Link>
        </div>

        {/* Content grid */}
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Left column */}
          <div className="lg:col-span-3 space-y-6">
            {/* Quick actions */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Quick Actions</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Link href="/explore">
                  <Card className="group cursor-pointer border-border/40 transition-all duration-200 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 h-full">
                    <CardContent className="flex items-start gap-4 p-5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <Compass className="h-5 w-5 text-emerald-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-sm">Explore Stocks</h4>
                          <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-emerald-500 transition-colors shrink-0" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Browse all tracked companies, filter by sector, compare growth profiles
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                <Card className="border-border/40 border-dashed">
                  <CardContent className="flex items-start gap-4 p-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/50 border border-border/60">
                      <BarChart3 className="h-5 w-5 text-muted-foreground/50" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm">Sector Analysis</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Compare peers across sectors to find the fastest grower at best value
                      </p>
                      <p className="text-[10px] text-muted-foreground/50 mt-2 font-medium">Coming soon</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Sectors covered */}
            {stats && stats.sectors.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Sectors Tracked</h3>
                <div className="flex flex-wrap gap-2">
                  {stats.sectors.map((s) => (
                    <Link key={s} href={`/explore?sector=${encodeURIComponent(s)}`}>
                      <span className="inline-flex items-center rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors cursor-pointer">
                        {s}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* How it works — for anonymous users */}
            {!isAuthenticated && !hasData && (
              <div className="rounded-xl border border-border/40 bg-card p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-emerald-500" />
                  How it works
                </h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    { step: "1", title: "Search & Track", desc: "Find any NSE/BSE stock by symbol and add it to your dashboard" },
                    { step: "2", title: "Upload Con-Calls", desc: "Upload earnings call PDFs and let AI analyze management guidance" },
                    { step: "3", title: "Find Bargains", desc: "Use PEG-based valuation to find the fastest car at the best price" },
                  ].map((item) => (
                    <div key={item.step} className="text-center space-y-2">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-sm font-bold text-emerald-500">
                        {item.step}
                      </div>
                      <h4 className="font-semibold text-sm">{item.title}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column: Recent activity */}
          <div className="lg:col-span-2">
            <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
            {stats && stats.recent_activity.length > 0 ? (
              <div className="space-y-2">
                {stats.recent_activity.map((a, i) => {
                  const cleanSymbol = a.symbol.replace(".NS", "").replace(".BO", "");
                  const timeAgo = a.analyzed_at ? formatTimeAgo(a.analyzed_at) : "";
                  return (
                    <Link key={i} href={`/stock/${encodeURIComponent(a.symbol)}`}>
                      <div className="flex items-center gap-3 rounded-lg border border-border/30 bg-card/50 px-4 py-3 hover:bg-accent/50 transition-colors cursor-pointer group">
                        <Activity className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium">{cleanSymbol}</span>
                          <span className="text-xs text-muted-foreground ml-2">{a.quarter}</span>
                        </div>
                        <span className="text-[11px] text-muted-foreground/60 shrink-0">{timeAgo}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/60 bg-card/30 p-8 text-center">
                <TrendingUp className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No analyses yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {isAuthenticated
                    ? "Search for a stock above to get started"
                    : "Sign in and search for a stock to get started"}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

function StatCard({
  icon: Icon,
  label,
  subtitle,
  value,
  color,
  bg,
  clickable,
}: {
  icon: React.ElementType;
  label: string;
  subtitle?: string;
  value: number;
  color: string;
  bg: string;
  clickable?: boolean;
}) {
  return (
    <div className={`rounded-xl border border-border/40 bg-card p-4 space-y-3 transition-all duration-200 ${
      clickable ? "cursor-pointer hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 group" : ""
    }`}>
      <div className="flex items-center justify-between">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg border ${bg}`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        {clickable && (
          <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-emerald-500 transition-colors" />
        )}
      </div>
      <div>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        {subtitle && (
          <p className="text-[10px] text-muted-foreground/50 mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}
