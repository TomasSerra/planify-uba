import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

// Números a mostrar con elipsis: siempre primera y última, y una ventana
// alrededor de la actual. Ej (actual=6, total=12): 1 … 5 6 7 … 12.
function buildPages(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return range(1, total);
  const out: (number | "ellipsis")[] = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);
  if (left > 2) out.push("ellipsis");
  out.push(...range(left, right));
  if (right < total - 1) out.push("ellipsis");
  out.push(total);
  return out;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  className,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  if (totalPages <= 1) return null;
  const items = buildPages(page, totalPages);

  return (
    <nav
      className={cn("flex items-center justify-center gap-1", className)}
      aria-label="Paginación"
    >
      <Button
        variant="outline"
        size="icon"
        className="size-9"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Página anterior"
      >
        <ChevronLeft className="size-4" />
      </Button>

      {/* Desktop: números con elipsis */}
      <div className="hidden items-center gap-1 sm:flex">
        {items.map((it, i) =>
          it === "ellipsis" ? (
            <span
              key={`ellipsis-${i}`}
              className="px-1.5 text-sm text-muted-foreground"
            >
              …
            </span>
          ) : (
            <Button
              key={it}
              variant={it === page ? "default" : "outline"}
              size="icon"
              className="size-9"
              onClick={() => onPageChange(it)}
              aria-current={it === page ? "page" : undefined}
            >
              {it}
            </Button>
          )
        )}
      </div>

      {/* Mobile: texto compacto */}
      <span className="px-3 text-sm text-muted-foreground sm:hidden">
        Página {page} de {totalPages}
      </span>

      <Button
        variant="outline"
        size="icon"
        className="size-9"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="Página siguiente"
      >
        <ChevronRight className="size-4" />
      </Button>
    </nav>
  );
}
