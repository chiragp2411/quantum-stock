"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";
import { useStock } from "@/hooks/use-stock";
import { toast } from "sonner";

export function StockSearch() {
  const [query, setQuery] = useState("");
  const { searchStock, loading } = useStock();
  const router = useRouter();

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    const result = await searchStock(query.trim());
    if (result) {
      toast.success(`Found ${result.name}`);
      router.push(`/stock/${encodeURIComponent(result.symbol)}`);
    } else {
      toast.error("Stock not found. Check the symbol and try again.");
    }
  }

  return (
    <form onSubmit={handleSearch} className="flex gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          id="stock-search"
          placeholder="Search by symbol — RELIANCE, TCS, INFY.BO..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-12 pl-10 text-[15px] bg-background border-border/60 focus-visible:ring-emerald-500/30"
        />
      </div>
      <Button
        type="submit"
        className="h-12 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
        disabled={loading || !query.trim()}
      >
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : null}
        Analyze
      </Button>
    </form>
  );
}
