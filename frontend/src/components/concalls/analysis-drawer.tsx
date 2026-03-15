"use client";

import ReactMarkdown from "react-markdown";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  FileText,
  Flag,
  MessageSquareQuote,
  Target,
  Zap,
  XIcon,
  Building2,
  Shield,
  TrendingUp,
  TrendingDown,
  Minus,
  Lightbulb,
  AlertTriangle as AlertTriangleIcon,
  Factory,
  MapPin,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Analysis {
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
}

interface AnalysisDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: Analysis;
  displayLabel: string;
  filename: string;
}

export function AnalysisDrawer({
  open,
  onOpenChange,
  analysis,
  displayLabel,
  filename,
}: AnalysisDrawerProps) {
  const hasBusinessData =
    analysis.business_model ||
    (analysis.moat_signals && analysis.moat_signals.length > 0) ||
    (analysis.competitive_advantages && analysis.competitive_advantages.length > 0);

  const hasFinancials =
    analysis.revenue_cr != null ||
    analysis.ebitda_cr != null ||
    analysis.pat_cr != null;

  const hasThesis =
    analysis.investment_thesis && analysis.investment_thesis.length > 0;

  const hasContradictions =
    analysis.contradictions && analysis.contradictions.length > 0;

  const hasCapex =
    (analysis.capex_plans && analysis.capex_plans.length > 0) ||
    analysis.capacity_utilization ||
    (analysis.geographic_expansion && analysis.geographic_expansion.length > 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full sm:!max-w-2xl lg:!max-w-3xl overflow-y-auto"
      >
        <SheetHeader className="border-b pb-4 sticky top-0 bg-background z-10">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <SheetTitle className="text-lg font-bold">
                {displayLabel}
              </SheetTitle>
              <SheetDescription className="text-xs mt-0.5 flex items-center gap-2">
                {filename}
                {analysis.analysis_provider && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-blue-500/10 text-blue-400 border-blue-500/20">
                    {analysis.analysis_provider}
                  </Badge>
                )}
              </SheetDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-3 mr-1">
                <ScorePill label="Tone" value={analysis.tone_score} />
                <ScorePill label="Exec" value={analysis.management_execution_score} />
              </div>
              {analysis.guidance_trajectory && (
                <TrajectoryBadge trajectory={analysis.guidance_trajectory} />
              )}
              {analysis.lynch_category && (
                <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-400 border-purple-500/20">
                  {analysis.lynch_category}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => onOpenChange(false)}
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        <div className="p-4">
          {/* Financial KPI strip */}
          {hasFinancials && <FinancialStrip analysis={analysis} />}

          <Tabs defaultValue="summary" className={hasFinancials ? "mt-4" : ""}>
            <TabsList className="bg-muted/50 w-full justify-start flex-wrap h-auto gap-0.5 p-1">
              <TabsTrigger value="summary" className="gap-1.5 text-xs data-[state=active]:bg-background">
                <FileText className="h-3 w-3" />
                Summary
              </TabsTrigger>
              <TabsTrigger value="guidance" className="gap-1.5 text-xs data-[state=active]:bg-background">
                <Target className="h-3 w-3" />
                Guidance
              </TabsTrigger>
              {hasBusinessData && (
                <TabsTrigger value="business" className="gap-1.5 text-xs data-[state=active]:bg-background">
                  <Building2 className="h-3 w-3" />
                  Business
                </TabsTrigger>
              )}
              {hasThesis && (
                <TabsTrigger value="thesis" className="gap-1.5 text-xs data-[state=active]:bg-background">
                  <Lightbulb className="h-3 w-3" />
                  Thesis
                </TabsTrigger>
              )}
              <TabsTrigger value="flags" className="gap-1.5 text-xs data-[state=active]:bg-background">
                <Flag className="h-3 w-3" />
                Flags
              </TabsTrigger>
              {hasCapex && (
                <TabsTrigger value="capex" className="gap-1.5 text-xs data-[state=active]:bg-background">
                  <Factory className="h-3 w-3" />
                  Capex
                </TabsTrigger>
              )}
              <TabsTrigger value="quotes" className="gap-1.5 text-xs data-[state=active]:bg-background">
                <MessageSquareQuote className="h-3 w-3" />
                Quotes
              </TabsTrigger>
            </TabsList>

            {/* === Summary Tab === */}
            <TabsContent value="summary" className="mt-4 space-y-6">
              {analysis.detailed_summary ? (
                <div className="concall-summary">
                  <ReactMarkdown>{analysis.detailed_summary}</ReactMarkdown>
                </div>
              ) : (
                <Section icon={<Zap className="h-3.5 w-3.5 text-amber-400" />} title="Key Highlights">
                  <ul className="space-y-2">
                    {analysis.highlights.map((h, i) => (
                      <li key={i} className="text-sm text-muted-foreground pl-5 relative before:content-['•'] before:absolute before:left-0 before:text-emerald-500 before:font-bold leading-relaxed">
                        {h}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {analysis.highlights.length > 0 && analysis.detailed_summary && (
                <div className="pt-4 border-t border-border/30">
                  <Section icon={<Zap className="h-3.5 w-3.5 text-amber-400" />} title="Key Highlights">
                    <ul className="space-y-2">
                      {analysis.highlights.map((h, i) => (
                        <li key={i} className="text-sm text-muted-foreground pl-5 relative before:content-['•'] before:absolute before:left-0 before:text-emerald-500 before:font-bold leading-relaxed">
                          {h}
                        </li>
                      ))}
                    </ul>
                  </Section>
                </div>
              )}
            </TabsContent>

            {/* === Guidance Tab === */}
            <TabsContent value="guidance" className="mt-4 space-y-6">
              {analysis.guidance_trajectory_detail && (
                <div className="rounded-lg bg-muted/30 border border-border/30 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrajectoryIcon trajectory={analysis.guidance_trajectory} />
                    <span className="text-sm font-semibold">Trajectory</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {analysis.guidance_trajectory_detail}
                  </p>
                </div>
              )}

              {Object.keys(analysis.guidance).length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {Object.entries(analysis.guidance).map(([key, val]) => (
                    <div key={key} className="rounded-lg bg-muted/30 border border-border/30 px-4 py-3">
                      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        {key.replace(/_/g, " ")}
                      </span>
                      <p className="text-sm font-semibold mt-1 leading-relaxed">{val}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground/60">No guidance data extracted</p>
              )}

              {hasContradictions && (
                <Section icon={<AlertTriangleIcon className="h-3.5 w-3.5 text-amber-400" />} title="Contradictions Detected">
                  <ul className="space-y-2">
                    {analysis.contradictions!.map((c, i) => (
                      <li key={i} className="text-sm text-amber-400/90 pl-5 relative before:content-['⚠'] before:absolute before:left-0 before:font-bold leading-relaxed">
                        {c}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
            </TabsContent>

            {/* === Business Model Tab === */}
            {hasBusinessData && (
              <TabsContent value="business" className="mt-4 space-y-6">
                {analysis.business_model && (
                  <Section icon={<Building2 className="h-3.5 w-3.5 text-blue-400" />} title="Business Model">
                    <p className="text-sm text-muted-foreground leading-relaxed">{analysis.business_model}</p>
                  </Section>
                )}

                {analysis.moat_signals && analysis.moat_signals.length > 0 && (
                  <Section icon={<Shield className="h-3.5 w-3.5 text-emerald-400" />} title="Moat Signals">
                    <ul className="space-y-2">
                      {analysis.moat_signals.map((s, i) => (
                        <li key={i} className="text-sm text-muted-foreground pl-5 relative before:content-['◆'] before:absolute before:left-0 before:text-emerald-500 before:font-bold leading-relaxed">
                          {s}
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}

                {analysis.competitive_advantages && analysis.competitive_advantages.length > 0 && (
                  <Section icon={<Zap className="h-3.5 w-3.5 text-purple-400" />} title="Competitive Advantages">
                    <ul className="space-y-2">
                      {analysis.competitive_advantages.map((a, i) => (
                        <li key={i} className="text-sm text-muted-foreground pl-5 relative before:content-['→'] before:absolute before:left-0 before:text-purple-400 before:font-bold leading-relaxed">
                          {a}
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}
              </TabsContent>
            )}

            {/* === Investment Thesis Tab === */}
            {hasThesis && (
              <TabsContent value="thesis" className="mt-4 space-y-6">
                <div className="space-y-3">
                  {analysis.investment_thesis!.map((bullet, i) => {
                    const icons = [
                      <TrendingUp key="buy" className="h-4 w-4 text-emerald-400 shrink-0" />,
                      <AlertTriangleIcon key="risk" className="h-4 w-4 text-amber-400 shrink-0" />,
                      <Flag key="exit" className="h-4 w-4 text-red-400 shrink-0" />,
                    ];
                    const labels = ["Growth Case", "Key Risks", "Switch Trigger"];
                    const borders = [
                      "border-emerald-500/30 bg-emerald-500/5",
                      "border-amber-500/30 bg-amber-500/5",
                      "border-red-500/30 bg-red-500/5",
                    ];
                    return (
                      <div key={i} className={`rounded-lg border p-4 ${borders[i] ?? "border-border/30"}`}>
                        <div className="flex items-center gap-2 mb-2">
                          {icons[i]}
                          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {labels[i] ?? `Point ${i + 1}`}
                          </span>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">{bullet}</p>
                      </div>
                    );
                  })}
                </div>

                {analysis.sector_best_pick_rationale && (
                  <Section icon={<BarChart3 className="h-3.5 w-3.5 text-blue-400" />} title="Sector Position">
                    <p className="text-sm text-muted-foreground leading-relaxed italic">
                      {analysis.sector_best_pick_rationale}
                    </p>
                  </Section>
                )}
              </TabsContent>
            )}

            {/* === Flags Tab === */}
            <TabsContent value="flags" className="mt-4 space-y-6">
              <Section icon={<Flag className="h-3.5 w-3.5 text-emerald-500" />} title={`Green Flags (${analysis.green_flags.length})`}>
                {analysis.green_flags.length === 0 ? (
                  <p className="text-sm text-muted-foreground/60">None identified</p>
                ) : (
                  <ul className="space-y-2">
                    {analysis.green_flags.map((f, i) => (
                      <li key={i} className="text-sm text-emerald-500/90 pl-5 relative before:content-['✓'] before:absolute before:left-0 before:font-bold leading-relaxed">
                        {f}
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section icon={<Flag className="h-3.5 w-3.5 text-red-400" />} title={`Red Flags (${analysis.red_flags.length})`}>
                {analysis.red_flags.length === 0 ? (
                  <p className="text-sm text-muted-foreground/60">None identified</p>
                ) : (
                  <ul className="space-y-2">
                    {analysis.red_flags.map((f, i) => (
                      <li key={i} className="text-sm text-red-400/90 pl-5 relative before:content-['✗'] before:absolute before:left-0 before:font-bold leading-relaxed">
                        {f}
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </TabsContent>

            {/* === Capex Tab === */}
            {hasCapex && (
              <TabsContent value="capex" className="mt-4 space-y-6">
                {analysis.capacity_utilization && (
                  <div className="rounded-lg bg-muted/30 border border-border/30 px-4 py-3">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Capacity Utilization
                    </span>
                    <p className="text-lg font-bold mt-1">{analysis.capacity_utilization}</p>
                  </div>
                )}

                {analysis.capex_plans && analysis.capex_plans.length > 0 && (
                  <Section icon={<Factory className="h-3.5 w-3.5 text-blue-400" />} title="Capex Plans">
                    <ul className="space-y-2">
                      {analysis.capex_plans.map((p, i) => (
                        <li key={i} className="text-sm text-muted-foreground pl-5 relative before:content-['◆'] before:absolute before:left-0 before:text-blue-400 before:font-bold leading-relaxed">
                          {p}
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}

                {analysis.geographic_expansion && analysis.geographic_expansion.length > 0 && (
                  <Section icon={<MapPin className="h-3.5 w-3.5 text-purple-400" />} title="Geographic Expansion">
                    <ul className="space-y-2">
                      {analysis.geographic_expansion.map((g, i) => (
                        <li key={i} className="text-sm text-muted-foreground pl-5 relative before:content-['→'] before:absolute before:left-0 before:text-purple-400 before:font-bold leading-relaxed">
                          {g}
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}
              </TabsContent>
            )}

            {/* === Quotes Tab === */}
            <TabsContent value="quotes" className="mt-4 space-y-4">
              {analysis.key_quotes.length === 0 ? (
                <p className="text-sm text-muted-foreground/60">No quotes extracted</p>
              ) : (
                analysis.key_quotes.map((q, i) => (
                  <blockquote key={i} className="border-l-2 border-blue-500/30 pl-4 py-2 text-sm text-muted-foreground italic leading-relaxed">
                    &ldquo;{q}&rdquo;
                  </blockquote>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FinancialStrip({ analysis }: { analysis: Analysis }) {
  const metrics = [
    { label: "Revenue", value: analysis.revenue_cr, suffix: " cr", growth: analysis.revenue_growth_yoy_pct },
    { label: "EBITDA", value: analysis.ebitda_cr, suffix: " cr", growth: null },
    { label: "PAT", value: analysis.pat_cr, suffix: " cr", growth: analysis.pat_growth_yoy_pct },
    { label: "EBITDA Margin", value: analysis.ebitda_margin_pct, suffix: "%", growth: null },
    { label: "PAT Margin", value: analysis.pat_margin_pct, suffix: "%", growth: null },
  ].filter((m) => m.value != null);

  if (metrics.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mt-4">
      {metrics.map((m) => (
        <div key={m.label} className="rounded-lg bg-muted/30 border border-border/30 px-3 py-2.5 text-center">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">
            {m.label}
          </span>
          <span className="text-base font-bold tabular-nums block mt-0.5">
            {m.label.includes("Margin") ? "" : "₹"}{m.value?.toLocaleString("en-IN")}{m.suffix}
          </span>
          {m.growth != null && (
            <span className={`text-[10px] font-semibold ${m.growth >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {m.growth >= 0 ? "+" : ""}{m.growth}% YoY
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function TrajectoryIcon({ trajectory }: { trajectory?: string | null }) {
  if (trajectory === "up") return <TrendingUp className="h-4 w-4 text-emerald-400" />;
  if (trajectory === "down") return <TrendingDown className="h-4 w-4 text-red-400" />;
  return <Minus className="h-4 w-4 text-zinc-400" />;
}

function TrajectoryBadge({ trajectory }: { trajectory: string }) {
  const config: Record<string, { icon: React.ReactNode; label: string; className: string }> = {
    up: { icon: <TrendingUp className="h-3 w-3" />, label: "Up", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    down: { icon: <TrendingDown className="h-3 w-3" />, label: "Down", className: "bg-red-500/10 text-red-400 border-red-500/20" },
    flat: { icon: <Minus className="h-3 w-3" />, label: "Flat", className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
  };
  const c = config[trajectory] ?? config.flat;
  return (
    <Badge variant="outline" className={`text-[10px] gap-1 ${c.className}`}>
      {c.icon}
      {c.label}
    </Badge>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="flex items-center gap-1.5 text-sm font-semibold mb-3">
        {icon}
        {title}
      </h4>
      {children}
    </div>
  );
}

function ScorePill({ label, value }: { label: string; value: number }) {
  const color = value >= 7 ? "text-emerald-500" : value >= 4 ? "text-blue-400" : "text-red-400";
  return (
    <div className="flex items-center gap-1">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={`text-sm font-bold tabular-nums ${color}`}>{value}/10</span>
    </div>
  );
}
