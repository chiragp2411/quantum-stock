"use client";

import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SlidersHorizontal } from "lucide-react";

interface SensitivitySliderProps {
  growthRate: number;
  bullDelta: number;
  bearDelta: number;
  onGrowthChange: (val: number) => void;
  onBullDeltaChange: (val: number) => void;
  onBearDeltaChange: (val: number) => void;
}

export function SensitivitySlider({
  growthRate,
  bullDelta,
  bearDelta,
  onGrowthChange,
  onBullDeltaChange,
  onBearDeltaChange,
}: SensitivitySliderProps) {
  return (
    <Card className="border-border/40">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          Sensitivity Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <SliderRow
          label="Base Growth Rate"
          value={growthRate}
          min={0}
          max={60}
          step={1}
          onChange={onGrowthChange}
          suffix="%"
          color="emerald"
        />
        <SliderRow
          label="Bull Delta"
          value={bullDelta}
          min={0}
          max={30}
          step={1}
          onChange={onBullDeltaChange}
          suffix="%"
          color="blue"
          description="Extra growth for optimistic case"
        />
        <SliderRow
          label="Bear Delta"
          value={bearDelta}
          min={0}
          max={30}
          step={1}
          onChange={onBearDeltaChange}
          suffix="%"
          color="red"
          description="Growth reduction for pessimistic case"
        />
      </CardContent>
    </Card>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  suffix,
  description,
  color = "emerald",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
  suffix: string;
  description?: string;
  color?: "emerald" | "blue" | "red";
}) {
  const valueColor = {
    emerald: "text-emerald-500",
    blue: "text-blue-400",
    red: "text-red-400",
  }[color];

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <span className={`text-sm font-bold tabular-nums ${valueColor}`}>
          {value}{suffix}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(val) => onChange(Array.isArray(val) ? val[0] : val)}
        className="[&_[role=slider]]:bg-emerald-400 [&_[role=slider]]:border-emerald-500"
      />
      {description && (
        <p className="text-[11px] text-muted-foreground/60">{description}</p>
      )}
    </div>
  );
}
