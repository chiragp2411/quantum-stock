"use client";

import { useState } from "react";
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
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full sm:!max-w-2xl lg:!max-w-3xl overflow-y-auto"
      >
        <SheetHeader className="border-b pb-4 sticky top-0 bg-background z-10">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-lg font-bold">
                {displayLabel}
              </SheetTitle>
              <SheetDescription className="text-xs mt-0.5">
                {filename}
              </SheetDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-3 mr-2">
                <ScorePill label="Tone" value={analysis.tone_score} />
                <ScorePill label="Execution" value={analysis.management_execution_score} />
              </div>
              {analysis.lynch_category && (
                <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-400 border-purple-500/20 mr-2">
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
          <Tabs defaultValue="summary">
            <TabsList className="bg-muted/50 w-full justify-start">
              <TabsTrigger value="summary" className="gap-1.5 text-xs data-[state=active]:bg-background">
                <FileText className="h-3 w-3" />
                Summary
              </TabsTrigger>
              <TabsTrigger value="guidance" className="gap-1.5 text-xs data-[state=active]:bg-background">
                <Target className="h-3 w-3" />
                Guidance
              </TabsTrigger>
              <TabsTrigger value="flags" className="gap-1.5 text-xs data-[state=active]:bg-background">
                <Flag className="h-3 w-3" />
                Flags
              </TabsTrigger>
              <TabsTrigger value="quotes" className="gap-1.5 text-xs data-[state=active]:bg-background">
                <MessageSquareQuote className="h-3 w-3" />
                Quotes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="mt-4 space-y-6">
              {analysis.detailed_summary ? (
                <div className="prose prose-sm dark:prose-invert max-w-none
                  prose-headings:text-foreground prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2
                  prose-p:text-muted-foreground prose-p:leading-relaxed
                  prose-li:text-muted-foreground prose-li:leading-relaxed
                  prose-strong:text-foreground prose-strong:font-semibold
                  prose-blockquote:border-blue-500/30 prose-blockquote:text-muted-foreground prose-blockquote:not-italic
                  prose-ul:my-1 prose-li:my-0.5">
                  <ReactMarkdown>{analysis.detailed_summary}</ReactMarkdown>
                </div>
              ) : (
                <>
                  <Section icon={<Zap className="h-3.5 w-3.5 text-amber-400" />} title="Key Highlights">
                    <ul className="space-y-2">
                      {analysis.highlights.map((h, i) => (
                        <li key={i} className="text-sm text-muted-foreground pl-5 relative before:content-['•'] before:absolute before:left-0 before:text-emerald-500 before:font-bold leading-relaxed">
                          {h}
                        </li>
                      ))}
                    </ul>
                  </Section>
                </>
              )}
            </TabsContent>

            <TabsContent value="guidance" className="mt-4 space-y-6">
              {Object.keys(analysis.guidance).length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {Object.entries(analysis.guidance).map(([key, val]) => (
                    <div key={key} className="rounded-lg bg-muted/30 border border-border/30 px-4 py-3">
                      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        {key.replace(/_/g, " ")}
                      </span>
                      <p className="text-sm font-semibold mt-1">{val}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground/60">No guidance data extracted</p>
              )}

              {analysis.highlights.length > 0 && (
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
            </TabsContent>

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
