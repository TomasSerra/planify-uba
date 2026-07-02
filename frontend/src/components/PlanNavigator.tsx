import { ChevronLeft, ChevronRight, Gem } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  index: number;
  total: number;
  displayTotal?: number;
  freemiumLocked?: boolean;
  onUpgrade?: () => void;
  onChange: (i: number) => void;
}

export function PlanNavigator({
  index,
  total,
  displayTotal,
  freemiumLocked,
  onUpgrade,
  onChange,
}: Props) {
  if (total === 0) return null;
  const isLast = index === total - 1;
  const lockedAtEnd = !!freemiumLocked && isLast;
  return (
    <div className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-2 sm:flex sm:w-auto">
      <Button
        variant="outline"
        size="icon"
        onClick={() => onChange(Math.max(0, index - 1))}
        disabled={index === 0}
      >
        <ChevronLeft className="size-4" />
      </Button>
      <div className="min-w-[110px] text-center text-sm">
        <span className="font-semibold">Plan {index + 1}</span>
        <span className="text-muted-foreground"> de {displayTotal ?? total}</span>
      </div>
      <Button
        variant="outline"
        size={lockedAtEnd ? "sm" : "icon"}
        onClick={
          lockedAtEnd
            ? onUpgrade
            : () => onChange(Math.min(total - 1, index + 1))
        }
        disabled={isLast && !lockedAtEnd}
        className={
          lockedAtEnd
            ? "gap-1 border-[#EC990B] px-2 text-[#EC990B] hover:bg-[#EC990B]/10 hover:text-[#EC990B]"
            : ""
        }
        title={lockedAtEnd ? "Hacete Pro para ver más planes" : undefined}
      >
        <ChevronRight className="size-4" />
        {lockedAtEnd && <Gem className="size-3.5" />}
      </Button>
    </div>
  );
}
