import { useEffect, useState } from "react";
import { Clock, Trash2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { loadHistory, removeHistory } from "@/lib/planHistory";
import type { PlanHistoryEntry } from "@/lib/types";

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `hace ${d} d`;
  return new Date(ts).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
  });
}

export function HistorialPopover({
  onRestore,
}: {
  onRestore: (entry: PlanHistoryEntry) => void;
}) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<PlanHistoryEntry[]>([]);

  useEffect(() => {
    if (open) setEntries(loadHistory());
  }, [open]);

  function handleRestore(entry: PlanHistoryEntry) {
    onRestore(entry);
    setOpen(false);
  }

  function handleRemove(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setEntries(removeHistory(id));
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Historial de planes generados"
          className="flex size-10 shrink-0 items-center justify-center self-start rounded-lg border border-border bg-white shadow-sm transition-colors hover:bg-accent"
        >
          <Clock className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(20rem,calc(100vw-2rem))] p-2">
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          Historial · últimos {entries.length}
        </div>
        {entries.length === 0 ? (
          <div className="px-2 py-6 text-center text-xs text-muted-foreground">
            Todavía no generaste ningún plan.
          </div>
        ) : (
          <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto sm:max-h-96">
            {entries.map((entry) => {
              const nMaterias = entry.filters.materias.length;
              const nPlanes = entry.response.planes.length;
              const nombres = entry.filters.materias
                .map((m) => m.nombre)
                .join(", ");
              return (
                <li
                  key={entry.id}
                  className="group flex cursor-pointer items-start gap-2 px-2 py-2 transition-colors hover:bg-accent"
                  onClick={() => handleRestore(entry)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatRelative(entry.createdAt)}</span>
                      <span>·</span>
                      <span>
                        {nMaterias} {nMaterias === 1 ? "materia" : "materias"}
                      </span>
                      <span>·</span>
                      <span>
                        {nPlanes} {nPlanes === 1 ? "plan" : "planes"}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-foreground">
                      {nombres || "Sin materias"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleRemove(e, entry.id)}
                    aria-label="Borrar entrada"
                    className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
