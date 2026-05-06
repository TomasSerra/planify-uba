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
    <div className="flex items-center justify-between gap-3">
      <div className="text-sm">
        <span className="font-semibold">Plan {index + 1}</span>
        <span className="text-muted-foreground"> de {total}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onChange(Math.max(0, index - 1))}
          disabled={index === 0}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onChange(Math.min(total - 1, index + 1))}
          disabled={index === total - 1}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
