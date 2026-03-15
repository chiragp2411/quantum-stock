"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LYNCH_CATEGORIES, PHASE_CONFIG } from "@/lib/constants";
import {
  Search,
  TrendingUp,
  FileText,
  ArrowUpRight,
  ArrowUpDown,
  Loader2,
  Building2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

interface Stock {
  _id: string;
  symbol: string;
  name: string;
  sector: string;
  current_price: number;
  pe_ratio: number;
  eps_growth: number;
  lynch_category: string;
  market_cap: number;
  concall_count: number;
  latest_phase: string | null;
}

interface ExploreResponse {
  stocks: Stock[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  sectors: string[];
}

type SortKey = "name" | "eps_growth" | "pe_ratio" | "market_cap" | "concall_count";

const PAGE_SIZES = [10, 25, 50, 100];

export default function ExplorePage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [data, setData] = useState<ExploreResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(searchParams.get("search") || "");
  const [sectorFilter, setSectorFilter] = useState(searchParams.get("sector") || "");
  const [sortKey, setSortKey] = useState<SortKey>((searchParams.get("sort_by") as SortKey) || "eps_growth");
  const [sortAsc, setSortAsc] = useState(searchParams.get("sort_order") === "asc");
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const [pageSize, setPageSize] = useState(Number(searchParams.get("page_size")) || 50);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async (params: {
    page: number;
    page_size: number;
    search: string;
    sector: string;
    sort_by: string;
    sort_order: string;
  }) => {
    setLoading(true);
    try {
      const res = await api.get("/api/stocks/explore", { params });
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const buildParams = useCallback(() => ({
    page,
    page_size: pageSize,
    search: searchInput,
    sector: sectorFilter,
    sort_by: sortKey,
    sort_order: sortAsc ? "asc" : "desc",
  }), [page, pageSize, searchInput, sectorFilter, sortKey, sortAsc]);

  useEffect(() => {
    let cancelled = false;
    const params = buildParams();
    (async () => {
      if (!cancelled) await fetchData(params);
    })();
    return () => { cancelled = true; };
  }, [page, pageSize, sectorFilter, sortKey, sortAsc, fetchData, buildParams]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchData({
        page: 1,
        page_size: pageSize,
        search: value,
        sector: sectorFilter,
        sort_by: sortKey,
        sort_order: sortAsc ? "asc" : "desc",
      });
    }, 400);
  };

  const handleSectorChange = (sector: string) => {
    const newSector = sector === sectorFilter ? "" : sector;
    setSectorFilter(newSector);
    setPage(1);
  };

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
    setPage(1);
  }

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    setPage(1);
  };

  const stocks = data?.stocks ?? [];
  const totalPages = data?.total_pages ?? 1;
  const total = data?.total ?? 0;
  const sectors = data?.sectors ?? [];

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8 space-y-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Explore Stocks</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Browse all tracked companies — search, filter by sector, sort, and compare growth profiles
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, symbol, or sector..."
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 h-10 bg-background border-border/60"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => { setSectorFilter(""); setPage(1); }}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  !sectorFilter
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                    : "text-muted-foreground border-border/60 hover:bg-accent/50"
                }`}
              >
                All sectors
              </button>
              {sectors.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSectorChange(s)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    sectorFilter === s
                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                      : "text-muted-foreground border-border/60 hover:bg-accent/50"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading && !data ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        ) : stocks.length === 0 && !loading ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-card/30 p-12 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">
              {total === 0 && !searchInput && !sectorFilter
                ? "No stocks tracked yet"
                : "No matches found"}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {total === 0 && !searchInput && !sectorFilter
                ? "Search for a stock on the dashboard to start tracking"
                : "Try a different search term or clear the sector filter"}
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground">
                {total} {total === 1 ? "stock" : "stocks"} found
                {sectorFilter && <> in <span className="font-medium text-foreground">{sectorFilter}</span></>}
                {searchInput && <> matching &quot;<span className="font-medium text-foreground">{searchInput}</span>&quot;</>}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Show</span>
                <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                  <SelectTrigger className="h-8 w-20 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZES.map((s) => (
                      <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">per page</span>
              </div>
            </div>

            <div className={`rounded-xl border border-border/40 overflow-hidden ${loading ? "opacity-60" : ""}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/40 bg-muted/30">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                        <SortButton label="Company" active={sortKey === "name"} asc={sortAsc} onClick={() => toggleSort("name")} />
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Sector</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                        <SortButton label="EPS Growth" active={sortKey === "eps_growth"} asc={sortAsc} onClick={() => toggleSort("eps_growth")} align="right" />
                      </th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">
                        <SortButton label="PE" active={sortKey === "pe_ratio"} asc={sortAsc} onClick={() => toggleSort("pe_ratio")} align="right" />
                      </th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Price</th>
                      <th className="text-center px-4 py-3 font-medium text-muted-foreground">Category</th>
                      <th className="text-center px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">
                        <SortButton label="Con-Calls" active={sortKey === "concall_count"} asc={sortAsc} onClick={() => toggleSort("concall_count")} align="center" />
                      </th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {stocks.map((s) => {
                      const cat = LYNCH_CATEGORIES[s.lynch_category as keyof typeof LYNCH_CATEGORIES];
                      const phaseConf = s.latest_phase ? PHASE_CONFIG[s.latest_phase as keyof typeof PHASE_CONFIG] : null;
                      const cleanSymbol = s.symbol.replace(".NS", "").replace(".BO", "");
                      const isPositive = (s.eps_growth ?? 0) > 0;
                      return (
                        <Link key={s._id} href={`/stock/${encodeURIComponent(s.symbol)}`} className="contents">
                          <tr className="border-b border-border/20 hover:bg-accent/30 transition-colors cursor-pointer group">
                            <td className="px-4 py-3">
                              <div className="font-semibold">{cleanSymbol}</div>
                              <div className="text-xs text-muted-foreground truncate max-w-[160px]">{s.name}</div>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">{s.sector}</td>
                            <td className="px-4 py-3 text-right">
                              <span className={`text-sm font-medium tabular-nums ${isPositive ? "text-emerald-500" : "text-red-400"}`}>
                                {isPositive ? "+" : ""}{s.eps_growth?.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-muted-foreground hidden md:table-cell">
                              {s.pe_ratio?.toFixed(1)}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums font-medium hidden lg:table-cell">
                              ₹{s.current_price?.toLocaleString("en-IN")}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                {cat && (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Badge variant="outline" className={`text-[10px] px-2 py-0 font-medium ${cat.color}`}>
                                        {s.lynch_category}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs"><p>{cat.description}</p></TooltipContent>
                                  </Tooltip>
                                )}
                                {phaseConf && (
                                  <Badge variant="outline" className={`text-[10px] px-2 py-0 font-medium ${phaseConf.bg} ${phaseConf.color} ${phaseConf.border}`}>
                                    {phaseConf.shortLabel}
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center hidden md:table-cell">
                              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                                <FileText className="h-3 w-3" />
                                {s.concall_count}
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              <ArrowUpRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-emerald-500 transition-colors" />
                            </td>
                          </tr>
                        </Link>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-muted-foreground">
                  Page {page} of {totalPages}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={page <= 1}
                    onClick={() => setPage(1)}
                  >
                    <ChevronsLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  {generatePageNumbers(page, totalPages).map((p, i) =>
                    p === "..." ? (
                      <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-foreground">...</span>
                    ) : (
                      <Button
                        key={p}
                        variant={p === page ? "default" : "outline"}
                        size="sm"
                        className={`h-8 w-8 p-0 text-xs ${p === page ? "bg-emerald-600 hover:bg-emerald-500" : ""}`}
                        onClick={() => setPage(p as number)}
                      >
                        {p}
                      </Button>
                    )
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={page >= totalPages}
                    onClick={() => setPage(totalPages)}
                  >
                    <ChevronsRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}

function generatePageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i);
  }
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

function SortButton({
  label,
  active,
  asc,
  onClick,
  align = "left",
}: {
  label: string;
  active: boolean;
  asc: boolean;
  onClick: () => void;
  align?: "left" | "right" | "center";
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 text-xs font-medium transition-colors hover:text-foreground ${
        align === "right" ? "justify-end ml-auto" : align === "center" ? "justify-center mx-auto" : ""
      } ${active ? "text-foreground" : "text-muted-foreground"}`}
    >
      {label}
      <ArrowUpDown className={`h-3 w-3 ${active ? "text-emerald-500" : "opacity-40"} ${active && asc ? "rotate-180" : ""}`} />
    </button>
  );
}
