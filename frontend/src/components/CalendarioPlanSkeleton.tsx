import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Mismas constantes que CalendarioPlan.tsx — el skeleton debe ocupar
// exactamente el mismo alto para que no haya layout shift cuando llega el
// resultado real.
const PIXELS_PER_HOUR_NORMAL = 32;
const PIXELS_PER_HOUR_COMPACTO = 16;
const HORA_MIN = 7;
const HORA_MAX = 23;
const HORAS = HORA_MAX - HORA_MIN;

// Bloques placeholder fijos (no aleatorios) para que el calendario "skeleton"
// se vea verosímil sin saltos entre renders.
const BLOQUES_POR_DIA: Array<Array<{ top: number; height: number }>> = [
  [{ top: 1, height: 2 }, { top: 5, height: 1.5 }],
  [{ top: 2, height: 1.5 }],
  [{ top: 3, height: 2 }, { top: 8, height: 1 }],
  [{ top: 1.5, height: 2 }],
  [{ top: 4, height: 1.5 }, { top: 7, height: 2 }],
  [{ top: 2.5, height: 1 }],
];

interface Props {
  compacto?: boolean;
}

export function CalendarioPlanSkeleton({ compacto = false }: Props) {
  const pxPerHour = compacto ? PIXELS_PER_HOUR_COMPACTO : PIXELS_PER_HOUR_NORMAL;
  const height = pxPerHour * HORAS;
  const gridCols = compacto
    ? "grid-cols-[72px_repeat(6,1fr)]"
    : "grid-cols-[40px_repeat(6,1fr)] sm:grid-cols-[64px_repeat(6,1fr)]";

  return (
    <div>
      <div className="-mx-6 overflow-x-auto overflow-y-clip px-6 sm:mx-0 sm:px-0">
        <div className="min-w-[560px] rounded-2xl border border-border bg-card sm:min-w-[760px]">
          <div className={cn("grid border-b border-border", gridCols)}>
            <div className="p-3" />
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex justify-center p-3">
                <Skeleton className="h-3 w-8" />
              </div>
            ))}
          </div>

          <div className={cn("grid", gridCols)}>
            <div
              className="relative border-r border-border"
              style={{ height }}
            />
            {BLOQUES_POR_DIA.map((bloques, idx) => (
              <div
                key={idx}
                className="relative border-r border-border last:border-r-0"
                style={{ height }}
              >
                {Array.from({ length: HORAS }, (_, i) => (
                  <div
                    key={i}
                    className="absolute inset-x-0 border-b border-border/50"
                    style={{ top: i * pxPerHour }}
                  />
                ))}
                {bloques.map((b, i) => (
                  <Skeleton
                    key={i}
                    className="absolute left-1 right-1 rounded-md"
                    style={{
                      top: b.top * pxPerHour,
                      height: b.height * pxPerHour,
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 sm:gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-7 w-32 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
