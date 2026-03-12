"use client";

import { useState, useCallback } from "react";
import api from "@/lib/api";

export interface StockInfo {
  symbol: string;
  name: string;
  exchange: string;
  sector: string;
  industry: string;
  market_cap: number;
  current_price: number;
  pe_ratio: number;
  eps: number;
  eps_growth: number;
  dividend_yield: number;
  week_52_high: number;
  week_52_low: number;
  lynch_category: string;
}

export function useStock() {
  const [stock, setStock] = useState<StockInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchStock = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/stocks/search", { params: { q: query } });
      setStock(res.data);
      return res.data;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch stock";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSummary = useCallback(async (symbol: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/api/stocks/${symbol}/summary`);
      return res.data;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch summary";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { stock, loading, error, searchStock, fetchSummary, setStock };
}
