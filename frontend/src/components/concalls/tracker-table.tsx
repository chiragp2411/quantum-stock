"use client";

import React, { useState } from "react";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Edit3,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Clock,
  Quote,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

interface GuidanceItemData {
  metric: string;
  metric_label: string;
  period: string;
  value_text: string;
  value_low: number | null;
  value_high: number | null;
  unit: string;
  guidance_type: string;
  revision: string;
  revision_detail: string | null;
  evidence_quote: string;
  confidence: number;
  conditions: string | null;
  segment: string | null;
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
  structured_new_guidance?: GuidanceItemData[];
  structured_prev_guidance?: GuidanceItemData[];
}

interface TrackerTableProps {
  symbol: string;
  tracker: TrackerRow[];
  concallIds: Record<string, string>;
  onRefresh: () => void;
}

const CATEGORY_ORDER = ["Growth", "Profitability", "Operations", "Other"];

const METRIC_TO_CATEGORY: Record<string, string> = {
  revenue_growth: "Growth",
  pat_growth: "Growth",
  ebitda_growth: "Growth",
  volume_growth: "Growth",
  earnings_cagr: "Growth",
  sssg: "Growth",
  revenue: "Profitability",
  ebitda: "Profitability",
  pat: "Profitability",
  ebitda_margin: "Profitability",
  pat_margin: "Profitability",
  gross_margin: "Profitability",
  roce: "Profitability",
  roe: "Profitability",
  capex: "Operations",
  store_count: "Operations",
  volume: "Operations",
  capacity: "Operations",
  capacity_utilization: "Operations",
  order_book: "Operations",
  market_share: "Operations",
  working_capital_days: "Operations",
  geographic_expansion: "Operations",
  employee_count: "Operations",
};

function categorizeItems(items: GuidanceItemData[]): Record<string, GuidanceItemData[]> {
  const groups: Record<string, GuidanceItemData[]> = {};
  for (const item of items) {
    const cat = METRIC_TO_CATEGORY[item.metric] || "Other";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  }
  return groups;
}

export function TrackerTable({
  symbol,
  tracker,
  concallIds,
  onRefresh,
}: TrackerTableProps) {
  if (tracker.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-card/30 p-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/50 mx-auto mb-4">
          <Clock className="h-6 w-6 text-muted-foreground/50" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">No tracker data available yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Upload and analyze con-call transcripts to build the guidance tracker
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/40 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-28 font-semibold text-xs uppercase tracking-wider">Period</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider">Previous Guidance</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider">Actuals</TableHead>
              <TableHead className="w-24 font-semibold text-xs uppercase tracking-wider">Delivered</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider">New Guidance</TableHead>
              <TableHead className="w-28 font-semibold text-xs uppercase tracking-wider">Trajectory</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {tracker.map((row) => (
              <TrackerRowComponent
                key={row.period}
                row={row}
                symbol={symbol}
                concallId={concallIds[row.period]}
                onRefresh={onRefresh}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function TrackerRowComponent({
  row,
  symbol,
  concallId,
  onRefresh,
}: {
  row: TrackerRow;
  symbol: string;
  concallId?: string;
  onRefresh: () => void;
}) {
  const hasStructured = row.structured_new_guidance && row.structured_new_guidance.length > 0;
  const hasPrevStructured = row.structured_prev_guidance && row.structured_prev_guidance.length > 0;

  return (
    <React.Fragment>
      <TableRow className="group align-top">
        <TableCell className="font-semibold text-sm">
          <div className="flex flex-col gap-0.5">
            <span>{row.period}</span>
            {row.tone_score != null && (
              <span className={`text-[10px] font-medium tabular-nums ${
                row.tone_score >= 7 ? "text-emerald-400" : row.tone_score >= 4 ? "text-blue-400" : "text-red-400"
              }`}>
                Tone: {row.tone_score}/10
              </span>
            )}
          </div>
        </TableCell>
        <TableCell>
          {hasPrevStructured ? (
            <StructuredGuidanceDisplay items={row.structured_prev_guidance!} compact />
          ) : (
            <LegacyGuidanceChips data={row.prev_guidance} />
          )}
        </TableCell>
        <TableCell>
          <LegacyGuidanceChips data={row.actuals} />
        </TableCell>
        <TableCell>
          <MetBadge status={row.met_missed} />
        </TableCell>
        <TableCell>
          {hasStructured ? (
            <StructuredGuidanceDisplay items={row.structured_new_guidance!} />
          ) : (
            <LegacyGuidanceChips data={row.new_guidance} variant="new" />
          )}
        </TableCell>
        <TableCell>
          <TrajectoryBadge direction={row.trajectory} />
        </TableCell>
        <TableCell>
          <OverrideDialog
            symbol={symbol}
            period={row.period}
            concallId={concallId}
            onDone={onRefresh}
          />
        </TableCell>
      </TableRow>

      {(row.surprise || (row.contradictions && row.contradictions.length > 0)) && (
        <TableRow className="border-t-0 bg-muted/15">
          <TableCell colSpan={7} className="py-2.5 pl-8">
            <div className="flex flex-col gap-2">
              {row.surprise && (
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="text-blue-400 font-medium shrink-0">Surprise:</span>
                  <span className="italic">{row.surprise}</span>
                </div>
              )}
              {row.contradictions && row.contradictions.length > 0 && (
                <div className="flex flex-wrap items-start gap-1.5">
                  <AlertTriangle className="h-3 w-3 text-amber-400 mt-0.5 shrink-0" />
                  {row.contradictions.map((c, i) => (
                    <span key={i} className="text-xs text-amber-400">
                      {c}{i < row.contradictions!.length - 1 ? " · " : ""}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </React.Fragment>
  );
}


function StructuredGuidanceDisplay({
  items,
  compact = false,
}: {
  items: GuidanceItemData[];
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const grouped = categorizeItems(items);
  const totalItems = items.length;
  const showToggle = totalItems > 4 && !compact;
  const visibleLimit = expanded || compact ? Infinity : 4;
  let rendered = 0;

  return (
    <div className="space-y-2 min-w-[200px]">
      {CATEGORY_ORDER.map((cat) => {
        const catItems = grouped[cat];
        if (!catItems || catItems.length === 0) return null;

        const itemsToShow: GuidanceItemData[] = [];
        for (const item of catItems) {
          if (rendered >= visibleLimit) break;
          itemsToShow.push(item);
          rendered++;
        }
        if (itemsToShow.length === 0) return null;

        return (
          <div key={cat}>
            {!compact && (
              <div className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest mb-1">
                {cat}
              </div>
            )}
            <div className="space-y-0.5">
              {itemsToShow.map((item, idx) => (
                <GuidanceItemRow key={`${item.metric}-${item.period}-${idx}`} item={item} compact={compact} />
              ))}
            </div>
          </div>
        );
      })}
      {showToggle && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              Show all {totalItems} items
            </>
          )}
        </button>
      )}
    </div>
  );
}

function GuidanceItemRow({ item, compact }: { item: GuidanceItemData; compact?: boolean }) {
  const label = item.segment
    ? `${item.metric_label} (${item.segment})`
    : item.metric_label;

  return (
    <div className="flex items-center gap-2 text-xs group/row">
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-muted-foreground truncate max-w-[140px] cursor-help">
            {label}
            {!compact && item.period && (
              <span className="text-muted-foreground/40 ml-1">{item.period}</span>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm">
          <div className="space-y-1">
            <p className="font-medium">{label} — {item.period}</p>
            <p className="text-xs">Value: {item.value_text}</p>
            {item.conditions && (
              <p className="text-xs text-amber-400">Condition: {item.conditions}</p>
            )}
            {item.revision_detail && (
              <p className="text-xs text-blue-400">{item.revision_detail}</p>
            )}
            {item.evidence_quote && (
              <div className="flex items-start gap-1 text-xs text-muted-foreground mt-1 border-t border-border/30 pt-1">
                <Quote className="h-3 w-3 shrink-0 mt-0.5" />
                <span className="italic">&ldquo;{item.evidence_quote}&rdquo;</span>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
      <span className="font-semibold text-foreground tabular-nums whitespace-nowrap">
        {item.value_text}
      </span>
      {!compact && <RevisionBadge revision={item.revision} type={item.guidance_type} />}
    </div>
  );
}

function RevisionBadge({ revision, type }: { revision: string; type: string }) {
  if (type === "withdrawn" || revision === "withdrawn") {
    return (
      <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 bg-red-500/5 text-red-400 border-red-500/15">
        WITHDRAWN
      </Badge>
    );
  }
  if (revision === "raised") {
    return (
      <span className="flex items-center gap-0.5 text-emerald-500">
        <ArrowUp className="h-3 w-3" />
        <span className="text-[9px] font-semibold">UP</span>
      </span>
    );
  }
  if (revision === "lowered") {
    return (
      <span className="flex items-center gap-0.5 text-red-400">
        <ArrowDown className="h-3 w-3" />
        <span className="text-[9px] font-semibold">DOWN</span>
      </span>
    );
  }
  if (revision === "maintained") {
    return (
      <span className="flex items-center gap-0.5 text-muted-foreground/50">
        <ArrowRight className="h-3 w-3" />
        <span className="text-[9px] font-medium">HELD</span>
      </span>
    );
  }
  if (revision === "new") {
    return (
      <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 bg-blue-500/5 text-blue-400 border-blue-500/15">
        NEW
      </Badge>
    );
  }
  return null;
}

function LegacyGuidanceChips({ data, variant = "default" }: { data: Record<string, string>; variant?: "default" | "new" }) {
  const entries = Object.entries(data);
  if (entries.length === 0) {
    return <span className="text-xs text-muted-foreground/50">&mdash;</span>;
  }
  return (
    <div className="space-y-0.5 min-w-[160px]">
      {entries.slice(0, 6).map(([key, val]) => (
        <div key={key} className="flex items-center gap-1.5 text-xs">
          <span className="text-muted-foreground truncate max-w-[120px] capitalize">
            {key.replace(/_/g, " ")}
          </span>
          <span className={`font-medium tabular-nums whitespace-nowrap ${
            variant === "new" ? "text-emerald-400" : "text-foreground"
          }`}>
            {val}
          </span>
        </div>
      ))}
      {entries.length > 6 && (
        <span className="text-[10px] text-muted-foreground/40">
          +{entries.length - 6} more
        </span>
      )}
    </div>
  );
}


function MetBadge({ status }: { status: string }) {
  if (status === "met") {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Met
      </Badge>
    );
  }
  if (status === "missed") {
    return (
      <Badge className="bg-red-500/10 text-red-400 border-red-500/20 gap-1">
        <XCircle className="h-3 w-3" />
        Missed
      </Badge>
    );
  }
  if (status === "partial") {
    return (
      <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 gap-1">
        <MinusCircle className="h-3 w-3" />
        Partial
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground/60 gap-1">
      <Clock className="h-3 w-3" />
      Pending
    </Badge>
  );
}

function TrajectoryBadge({ direction }: { direction: string }) {
  if (direction === "up") {
    return (
      <div className="flex items-center gap-1.5 text-emerald-400">
        <ArrowUp className="h-4 w-4" />
        <span className="text-xs font-semibold">Up</span>
      </div>
    );
  }
  if (direction === "down") {
    return (
      <div className="flex items-center gap-1.5 text-red-400">
        <ArrowDown className="h-4 w-4" />
        <span className="text-xs font-semibold">Down</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-muted-foreground/60">
      <ArrowRight className="h-4 w-4" />
      <span className="text-xs font-medium">Flat</span>
    </div>
  );
}

function OverrideDialog({
  symbol,
  period,
  concallId,
  onDone,
}: {
  symbol: string;
  period: string;
  concallId?: string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [revenue, setRevenue] = useState("");
  const [pat, setPat] = useState("");
  const [eps, setEps] = useState("");
  const [margin, setMargin] = useState("");
  const [saving, setSaving] = useState(false);

  if (!concallId) return null;

  async function handleSave() {
    setSaving(true);
    try {
      await api.put(
        `/api/concalls/${encodeURIComponent(symbol)}/${concallId}/override`,
        {
          revenue: revenue ? parseFloat(revenue) : null,
          pat: pat ? parseFloat(pat) : null,
          eps: eps ? parseFloat(eps) : null,
          margin: margin ? parseFloat(margin) : null,
        }
      );
      toast.success(`Actuals updated for ${period}`);
      setOpen(false);
      onDone();
    } catch {
      toast.error("Failed to update actuals");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity" />}>
        <Edit3 className="h-3.5 w-3.5" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Override Actuals — {period}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <p className="text-sm text-muted-foreground">
            Enter actual numbers when financial data is unavailable.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Revenue (Cr)</Label>
              <Input
                type="number"
                value={revenue}
                onChange={(e) => setRevenue(e.target.value)}
                placeholder="e.g. 5000"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">PAT (Cr)</Label>
              <Input
                type="number"
                value={pat}
                onChange={(e) => setPat(e.target.value)}
                placeholder="e.g. 800"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">EPS (₹)</Label>
              <Input
                type="number"
                value={eps}
                onChange={(e) => setEps(e.target.value)}
                placeholder="e.g. 25.5"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Margin (%)</Label>
              <Input
                type="number"
                value={margin}
                onChange={(e) => setMargin(e.target.value)}
                placeholder="e.g. 22"
              />
            </div>
          </div>
          <Button
            onClick={handleSave}
            className="w-full bg-emerald-600 hover:bg-emerald-500"
            disabled={saving}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Actuals
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
