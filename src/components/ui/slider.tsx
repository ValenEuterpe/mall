"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export interface SliderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "value"> {
  min?: number;
  max?: number;
  step?: number;
  value?: number[];
  defaultValue?: number[];
  onValueChange?: (value: number[]) => void;
  disabled?: boolean;
}

/**
 * Minimal slider implementation.
 *
 * The canonical shadcn/ui Slider depends on `@radix-ui/react-slider`, which is not
 * installed in this repo.
 *
 * This implementation supports 1-thumb and 2-thumb sliders and matches the API
 * used by our filter components (`value`/`onValueChange`).
 */
export function Slider({
  min = 0,
  max = 100,
  step = 1,
  value,
  defaultValue = [min],
  onValueChange,
  disabled,
  className,
  ...props
}: SliderProps) {
  const isControlled = value !== undefined;

  const [internal, setInternal] = React.useState<number[]>(() => {
    const initial = defaultValue.length ? defaultValue : [min];
    return normalize(initial, min, max);
  });

  const current = isControlled ? (value as number[]) : internal;

  const emit = (next: number[]) => {
    const normalized = normalize(next, min, max);
    if (!isControlled) setInternal(normalized);
    onValueChange?.(normalized);
  };

  if (current.length >= 2) {
    const [a, b] = normalize([current[0], current[1]], min, max);
    const range = max - min || 1;
    const pctA = ((a - min) / range) * 100;
    const pctB = ((b - min) / range) * 100;

    return (
      <div className={cn("relative w-full", className)} {...props}>
        {/* Track background */}
        <div className="relative h-2 w-full rounded-full bg-muted">
          {/* Active range highlight */}
          <div
            className="absolute h-full rounded-full bg-primary"
            style={{ left: `${pctA}%`, width: `${pctB - pctA}%` }}
          />
        </div>

        <div className="relative -mt-2">
          {/* Min thumb — sits above when pointer is in the left half */}
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={a}
            disabled={disabled}
            onChange={(e) => {
              const v = Number(e.target.value);
              emit([Math.min(v, b), b]);
            }}
            className={cn(rangeClassName, "z-[2]")}
          />
          {/* Max thumb */}
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={b}
            disabled={disabled}
            onChange={(e) => {
              const v = Number(e.target.value);
              emit([a, Math.max(v, a)]);
            }}
            className={cn(rangeClassName, "z-[3]")}
          />
        </div>
      </div>
    );
  }

  const single = clamp(current[0] ?? min, min, max);

  return (
    <div className={cn("relative w-full", className)} {...props}>
      <div className="relative h-2 w-full rounded-full bg-muted" />
      <div className="relative -mt-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={single}
          disabled={disabled}
          onChange={(e) => emit([Number(e.target.value)])}
          className={rangeClassName}
        />
      </div>
    </div>
  );
}

const rangeClassName = cn(
  "pointer-events-none absolute left-0 top-0 h-2 w-full appearance-none bg-transparent",
  "[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5",
  "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
  "[&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow [&::-webkit-slider-thumb]:cursor-pointer",
  "[&::-webkit-slider-thumb]:ring-2 [&::-webkit-slider-thumb]:ring-background",
  "[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5",
  "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary",
  "[&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer",
  "[&::-moz-range-thumb]:shadow [&::-moz-range-thumb]:ring-2 [&::-moz-range-thumb]:ring-background"
);

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function normalize(values: number[], min: number, max: number) {
  if (values.length < 2) return [clamp(values[0] ?? min, min, max)];
  const a = clamp(values[0] ?? min, min, max);
  const b = clamp(values[1] ?? max, min, max);
  return a <= b ? [a, b] : [b, a];
}

