"use client";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ShieldCheck, ShieldAlert, Shield } from "lucide-react";

interface CredibilityBadgeProps {
  hitRatePct: number | null;
  quartersTracked: number;
  quartersMet: number;
}

export function CredibilityBadge({ hitRatePct, quartersTracked, quartersMet }: CredibilityBadgeProps) {
  if (hitRatePct == null || quartersTracked === 0) {
    return null;
  }

  const level = hitRatePct >= 80 ? "high" : hitRatePct >= 50 ? "medium" : "low";
  const config = {
    high: {
      icon: ShieldCheck,
      label: `${hitRatePct}% Reliable`,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
      desc: "Management consistently delivers on guidance — a reliable driver.",
    },
    medium: {
      icon: Shield,
      label: `${hitRatePct}% Reliability`,
      color: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
      desc: "Mixed track record on guidance — watch for improvement or decline.",
    },
    low: {
      icon: ShieldAlert,
      label: `${hitRatePct}% Reliability`,
      color: "text-red-400",
      bg: "bg-red-500/10 border-red-500/20",
      desc: "Management frequently misses guidance — high execution risk.",
    },
  };

  const c = config[level];
  const Icon = c.icon;

  return (
    <Tooltip>
      <TooltipTrigger>
        <Badge variant="outline" className={`${c.bg} ${c.color} text-xs font-medium gap-1.5 px-2.5 py-1`}>
          <Icon className="h-3 w-3" />
          Driver: {c.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="font-medium mb-1">{c.desc}</p>
        <p className="text-xs text-muted-foreground">
          {quartersMet} of {quartersTracked} tracked quarters met guidance
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
