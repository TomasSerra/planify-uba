import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, GraduationCap, Loader2 } from "lucide-react";

import { api } from "@/lib/api";
import { useCareer } from "@/lib/career";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ErrorState } from "@/components/ErrorState";

export function CarreraSelector() {
  const { carrera, setCarrera } = useCareer();
  const [open, setOpen] = useState(false);
  const { data: carreras, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["carreras"],
    queryFn: () => api.listCarreras(),
  });

  const sel = carreras?.find((c) => c.slug === carrera);

  if (error && !carreras) {
    return (
      <div className="flex w-full flex-col gap-1.5">
        <span className="text-xs font-medium text-foreground">Carrera</span>
        <ErrorState
          title="No pudimos cargar las carreras"
          description="Revisá tu conexión y volvé a intentar."
          onRetry={() => refetch()}
          retrying={isFetching}
          className="py-4"
        />
      </div>
    );
  }

  if (isLoading || !carreras) {
    return (
      <div className="flex w-full flex-col gap-1.5">
        <span className="text-xs font-medium text-foreground">Carrera</span>
        <button
          type="button"
          disabled
          className="flex h-10 w-full items-center gap-2 rounded-lg border border-input bg-white px-3 text-left text-sm font-medium text-muted-foreground max-sm:min-h-[44px]"
        >
          <GraduationCap className="size-4 shrink-0 text-[#861f5c]" />
          <span className="flex-1 truncate">Cargando carreras</span>
          <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-1.5">
      <span className="text-xs font-medium text-foreground">Carrera</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-10 w-full items-center gap-2 rounded-lg border border-input bg-white px-3 text-left text-sm font-medium transition-colors hover:bg-accent max-sm:min-h-[44px]"
          >
            <GraduationCap className="size-4 shrink-0 text-[#861f5c]" />
            <span className="flex-1 truncate">
              {sel?.nombre ?? "Seleccionar carrera"}
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-1"
          align="start"
        >
          {(carreras ?? []).map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => {
                void setCarrera(c.slug);
                setOpen(false);
              }}
              className={
                "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent max-sm:min-h-[44px] " +
                (c.slug === carrera ? "bg-accent font-medium" : "")
              }
            >
              <span className="flex-1 truncate">{c.nombre}</span>
            </button>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}
