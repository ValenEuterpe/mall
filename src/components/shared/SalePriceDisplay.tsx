import { cn } from "@/lib/utils";

type SalePriceDisplaySize = "sm" | "default" | "lg";

interface SalePriceDisplayProps {
  effectivePrice: string;
  basePrice: string | null;
  size?: SalePriceDisplaySize;
}

const sizeConfig: Record<
  SalePriceDisplaySize,
  { effective: string; base: string; gap: string }
> = {
  sm: {
    effective: "text-sm font-semibold",
    base: "text-xs line-through",
    gap: "gap-1.5",
  },
  default: {
    effective: "text-xl font-bold",
    base: "text-sm line-through",
    gap: "gap-2",
  },
  lg: {
    effective: "text-2xl font-bold",
    base: "text-base line-through",
    gap: "gap-2",
  },
};

export function SalePriceDisplay({
  effectivePrice,
  basePrice,
  size = "default",
}: SalePriceDisplayProps) {
  const config = sizeConfig[size];

  if (basePrice) {
    return (
      <div className={cn("flex items-baseline", config.gap)}>
        <p className={cn("text-destructive", config.effective)}>
          {effectivePrice}
        </p>
        <p className={cn("text-muted-foreground", config.base)}>{basePrice}</p>
      </div>
    );
  }

  return (
    <p className={cn("text-primary", config.effective)}>{effectivePrice}</p>
  );
}
