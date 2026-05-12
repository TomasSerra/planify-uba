import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  index: number;
  total: number;
  onChange: (i: number) => void;
}

export function PlanNavigator({ index, total, onChange }: Props) {
  if (total === 0) return null;
  return (
    <div className="flex items-center gap-2">
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
        <span className="text-muted-foreground"> de {total}</span>
      </div>
      <Button
        variant="outline"
        size="icon"
        onClick={() => onChange(Math.min(total - 1, index + 1))}
        disabled={index === total - 1}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
