"use client";

import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Edit3,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface TrackerRow {
  period: string;
  prev_guidance: Record<string, string>;
  actuals: Record<string, string>;
  met_missed: string;
  reasons: string;
  new_guidance: Record<string, string>;
  trajectory: string;
}

interface TrackerTableProps {
  symbol: string;
  tracker: TrackerRow[];
  concallIds: Record<string, string>;
  onRefresh: () => void;
}

export function TrackerTable({
  symbol,
  tracker,
  concallIds,
  onRefresh,
}: TrackerTableProps) {
  if (tracker.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No tracker data available yet. Upload and analyze con-call transcripts to
        build the guidance tracker.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/40 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-24">Period</TableHead>
            <TableHead>Previous Guidance</TableHead>
            <TableHead>Actuals</TableHead>
            <TableHead className="w-24">Met/Missed</TableHead>
            <TableHead>New Guidance</TableHead>
            <TableHead className="w-24">Trajectory</TableHead>
            <TableHead className="w-16" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {tracker.map((row) => (
            <TableRow key={row.period}>
              <TableCell className="font-medium">{row.period}</TableCell>
              <TableCell>
                <GuidanceChips data={row.prev_guidance} />
              </TableCell>
              <TableCell>
                <GuidanceChips data={row.actuals} />
              </TableCell>
              <TableCell>
                <MetBadge status={row.met_missed} />
              </TableCell>
              <TableCell>
                <GuidanceChips data={row.new_guidance} />
              </TableCell>
              <TableCell>
                <TrajectoryIcon direction={row.trajectory} />
              </TableCell>
              <TableCell>
                <OverrideDialog
                  symbol={symbol}
                  period={row.period}
                  concallId={concallIds[row.period]}
                  onDone={onRefresh}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function GuidanceChips({ data }: { data: Record<string, string> }) {
  const entries = Object.entries(data);
  if (entries.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {entries.map(([key, val]) => (
        <Badge key={key} variant="outline" className="text-xs font-normal">
          <span className="capitalize">{key}:</span>&nbsp;{val}
        </Badge>
      ))}
    </div>
  );
}

function MetBadge({ status }: { status: string }) {
  if (status === "met") {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
        Met
      </Badge>
    );
  }
  if (status === "missed") {
    return (
      <Badge className="bg-red-500/10 text-red-400 border-red-500/20">
        Missed
      </Badge>
    );
  }
  if (status === "partial") {
    return (
      <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">
        Partial
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Pending
    </Badge>
  );
}

function TrajectoryIcon({ direction }: { direction: string }) {
  if (direction === "up") {
    return <ArrowUp className="h-4 w-4 text-emerald-400" />;
  }
  if (direction === "down") {
    return <ArrowDown className="h-4 w-4 text-red-400" />;
  }
  return <ArrowRight className="h-4 w-4 text-muted-foreground" />;
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
      <DialogTrigger render={<Button variant="ghost" size="sm" className="h-7 w-7 p-0" />}>
        <Edit3 className="h-3.5 w-3.5" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Override Actuals — {period}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <p className="text-sm text-muted-foreground">
            Enter actual numbers when yfinance data is unavailable. Like
            manually updating the car&apos;s speedometer reading.
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
            className="w-full bg-emerald-600 hover:bg-emerald-700"
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
