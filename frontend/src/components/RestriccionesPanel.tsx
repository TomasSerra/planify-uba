import {
  Plus,
  Trash2,
  MapPin,
  CalendarCheck,
  Clock,
  Check,
  Gem,
  Hourglass,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { DIAS, SEDES, type FranjaExcluida } from "@/lib/types";

const DIA_LABELS_SHORT: Record<string, string> = {
  lunes: "Lun",
  martes: "Mar",
  miercoles: "Mié",
  jueves: "Jue",
  viernes: "Vie",
  sabado: "Sáb",
};

interface Props {
  diasPermitidos: string[];
  onDiasPermitidosChange: (dias: string[]) => void;

  franjas: FranjaExcluida[];
  onFranjasChange: (franjas: FranjaExcluida[]) => void;

  sedesPermitidas: string[];
  onSedesChange: (sedes: string[]) => void;

  maxBacheHoras: number | null;
  onMaxBacheHorasChange: (h: number | null) => void;

  isPaid: boolean;
  isLoading?: boolean;
  onUpgrade?: () => void;
}

export function RestriccionesPanel({
  diasPermitidos,
  onDiasPermitidosChange,
  franjas,
  onFranjasChange,
  sedesPermitidas,
  onSedesChange,
  maxBacheHoras,
  onMaxBacheHorasChange,
  isPaid,
  isLoading,
  onUpgrade,
}: Props) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full rounded-lg" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-44" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-20 rounded-full" />
            ))}
          </div>
        </div>
        <Skeleton className="h-px w-full" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-52" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
        <Skeleton className="h-px w-full" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-40" />
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  function toggleDia(dia: string) {
    onDiasPermitidosChange(
      diasPermitidos.includes(dia)
        ? diasPermitidos.filter((d) => d !== dia)
        : [...diasPermitidos, dia]
    );
  }

  function toggleSede(codigo: string) {
    onSedesChange(
      sedesPermitidas.includes(codigo)
        ? sedesPermitidas.filter((s) => s !== codigo)
        : [...sedesPermitidas, codigo]
    );
  }

  function addFranja() {
    onFranjasChange([
      ...franjas,
      { dias: ["lunes"], hora_inicio: "09:00", hora_fin: "12:00" },
    ]);
  }

  function updateFranja(idx: number, patch: Partial<FranjaExcluida>) {
    onFranjasChange(
      franjas.map((f, i) => (i === idx ? { ...f, ...patch } : f))
    );
  }

  function toggleFranjaDia(idx: number, dia: string) {
    const f = franjas[idx];
    const nuevo = f.dias.includes(dia)
      ? f.dias.filter((d) => d !== dia)
      : [...f.dias, dia];
    if (nuevo.length === 0) return; // no permitir franja sin días
    updateFranja(idx, { dias: nuevo });
  }

  function removeFranja(idx: number) {
    onFranjasChange(franjas.filter((_, i) => i !== idx));
  }

  return (
    <div className="flex flex-col gap-4 lg:h-full lg:min-h-0">
      {!isPaid && (
        <div className="flex flex-col gap-3 rounded-lg border border-[#EC990B]/40 bg-[#EC990B]/10 px-4 py-3 sm:flex-row sm:items-start">
          <div className="flex flex-1 items-start gap-3">
            <Gem className="mt-0.5 size-4 shrink-0 text-[#EC990B]" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-foreground">
                Filtros disponibles solo para Pro
              </p>
              <p className="mt-0.5 text-muted-foreground">
                Hacete Pro para filtrar por días, franjas horarias y sedes.
              </p>
            </div>
          </div>
          {onUpgrade && (
            <Button
              size="sm"
              onClick={onUpgrade}
              className="w-full shrink-0 bg-[#EC990B] text-white hover:bg-[#EC990B]/90 sm:w-auto"
            >
              Hacete Pro
            </Button>
          )}
        </div>
      )}

      <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
      <div
        className={
          "space-y-6 " +
          (!isPaid ? "pointer-events-none select-none opacity-50" : "")
        }
        aria-disabled={!isPaid}
      >
      {/* Días permitidos */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <CalendarCheck className="size-4 text-muted-foreground" />
          <Label className="text-sm">Días que querés cursar</Label>
        </div>
        <div className="flex flex-wrap gap-2">
          {DIAS.map((dia) => {
            const active = diasPermitidos.includes(dia);
            return (
              <button
                key={dia}
                type="button"
                onClick={() => toggleDia(dia)}
                className={
                  "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors " +
                  (active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-white text-muted-foreground hover:bg-accent")
                }
              >
                {active && <Check className="size-3.5" strokeWidth={3} />}
                {DIA_LABELS_SHORT[dia]}
              </button>
            );
          })}
        </div>
        {diasPermitidos.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Si no marcás ninguno, no se podrán generar planes.
          </p>
        )}
      </section>

      <Separator />

      {/* Franjas horarias bloqueadas (multi-día) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-muted-foreground" />
            <Label className="text-sm">Franjas horarias bloqueadas</Label>
          </div>
          <Button variant="outline" size="sm" onClick={addFranja}>
            <Plus className="size-3.5" />
            Agregar
          </Button>
        </div>
        {franjas.length === 0 ? (
          <p className="rounded-lg bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
            Sin franjas bloqueadas. Una franja se aplica a uno o varios días con
            el mismo rango horario.
          </p>
        ) : (
          <div className="space-y-2">
            {franjas.map((f, i) => (
              <div
                key={i}
                className="space-y-2 rounded-lg border border-border bg-background p-3"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  {DIAS.map((d) => {
                    const active = f.dias.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleFranjaDia(i, d)}
                        className={
                          "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors " +
                          (active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-white text-muted-foreground hover:bg-accent")
                        }
                      >
                        {active && <Check className="size-3" strokeWidth={3} />}
                        {DIA_LABELS_SHORT[d]}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={f.hora_inicio}
                    onChange={(e) =>
                      updateFranja(i, { hora_inicio: e.target.value })
                    }
                    className="h-9 w-full max-w-[8rem]"
                  />
                  <span className="text-sm text-muted-foreground">a</span>
                  <Input
                    type="time"
                    value={f.hora_fin}
                    onChange={(e) =>
                      updateFranja(i, { hora_fin: e.target.value })
                    }
                    className="h-9 w-full max-w-[8rem]"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFranja(i)}
                    className="ml-auto text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Separator />

      {/* Sedes */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-muted-foreground" />
            <Label className="text-sm">Sedes permitidas</Label>
          </div>
          {sedesPermitidas.length > 0 && (
            <button
              type="button"
              onClick={() => onSedesChange([])}
              className="text-xs font-medium text-primary hover:underline"
            >
              Limpiar
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Si no seleccionás ninguna, se permiten todas.
        </p>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {SEDES.map((s) => (
            <label
              key={s.codigo}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-white px-3 py-2 transition-colors hover:bg-accent"
            >
              <Checkbox
                checked={sedesPermitidas.includes(s.codigo)}
                onCheckedChange={() => toggleSede(s.codigo)}
              />
              <span className="flex-1 text-sm">{s.nombre}</span>
              <span className="text-xs text-muted-foreground">{s.codigo}</span>
            </label>
          ))}
        </div>
      </section>

      <Separator />

      {/* Bache máximo */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hourglass className="size-4 text-muted-foreground" />
            <Label className="text-sm">Bache máximo entre clases</Label>
          </div>
          {maxBacheHoras !== null && (
            <button
              type="button"
              onClick={() => onMaxBacheHorasChange(null)}
              className="text-xs font-medium text-primary hover:underline"
            >
              Limpiar
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Descartar planes con un hueco mayor a este valor entre clases
          consecutivas del mismo día.
        </p>
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-28 items-stretch overflow-hidden rounded-lg border border-input bg-white">
            <Input
              type="number"
              min={0}
              step={0.5}
              placeholder="Sin límite"
              value={maxBacheHoras ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") {
                  onMaxBacheHorasChange(null);
                  return;
                }
                const n = Number(v);
                if (Number.isFinite(n) && n >= 0) onMaxBacheHorasChange(n);
              }}
              className="h-full flex-1 rounded-none border-0 bg-transparent px-2 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [appearance:textfield]"
            />
            <div className="flex flex-col border-l border-input">
              <button
                type="button"
                aria-label="Aumentar"
                onClick={() =>
                  onMaxBacheHorasChange(
                    Math.max(0, (maxBacheHoras ?? 0) + 0.5)
                  )
                }
                className="flex flex-1 items-center justify-center px-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <ChevronUp className="size-3" strokeWidth={2.5} />
              </button>
              <button
                type="button"
                aria-label="Disminuir"
                onClick={() =>
                  onMaxBacheHorasChange(
                    Math.max(0, (maxBacheHoras ?? 0) - 0.5)
                  )
                }
                disabled={(maxBacheHoras ?? 0) <= 0}
                className="flex flex-1 items-center justify-center border-t border-input px-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <ChevronDown className="size-3" strokeWidth={2.5} />
              </button>
            </div>
          </div>
          <span className="text-sm text-muted-foreground">horas</span>
        </div>
      </section>
      </div>
      </div>
    </div>
  );
}
