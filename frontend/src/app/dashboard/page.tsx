"use client";

import { Header } from "@/components/layout/header";
import { AuthGuard } from "@/components/layout/auth-guard";
import { StockSearch } from "@/components/dashboard/stock-search";
import { RecentAnalyses } from "@/components/dashboard/recent-analyses";
import { useAuth } from "@/hooks/use-auth";

export default function DashboardPage() {
  const { username } = useAuth();

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <AuthGuard>
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Welcome + Search */}
        <div className="mb-10 space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {greeting()}, {username}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Search for an NSE/BSE stock to begin your equity research
            </p>
          </div>

          <div className="max-w-2xl">
            <StockSearch />
          </div>
        </div>

        {/* Recent analyses */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold">Recent Analyses</h3>
          </div>
          <RecentAnalyses />
        </div>
      </main>
    </AuthGuard>
  );
}
