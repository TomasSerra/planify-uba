import { useMemo, useRef, useState } from "react";
import type { Plan, CursoEnPlan } from "@/lib/types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  AlertTriangle,
  Clock,
  DoorOpen,
  GraduationCap,
  MapPin,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsTouchDevice } from "@/lib/useIsTouchDevice";

const DIAS_DISPLAY = [
  { key: "lunes", short: "Lun" },
  { key: "martes", short: "Mar" },
  { key: "miercoles", short: "Mié" },
  { key: "jueves", short: "Jue" },
  { key: "viernes", short: "Vie" },
  { key: "sabado", short: "Sáb" },
];

const PIXELS_PER_HOUR_NORMAL = 32;
const PIXELS_PER_HOUR_COMPACTO = 16;

interface CursoConContexto extends CursoEnPlan {
  materia_codigo: number;
  materia_nombre: string;
  materia_color: string;
  catedra_titular: string | null;
  sinCupos: boolean;
}

interface Props {
  plan: Plan | null;
  compacto?: boolean;
}

// Paleta acorde al primario (variaciones de hue cercanas + neutros).
const PALETTE = [
  { bg: "bg-primary text-primary-foreground", dot: "bg-primary-foreground/80" },
  { bg: "bg-rose-500 text-white", dot: "bg-white/80" },
  { bg: "bg-amber-500 text-white", dot: "bg-white/80" },
  { bg: "bg-emerald-600 text-white", dot: "bg-white/80" },
  { bg: "bg-sky-600 text-white", dot: "bg-white/80" },
  { bg: "bg-violet-600 text-white", dot: "bg-white/80" },
  { bg: "bg-fuchsia-600 text-white", dot: "bg-white/80" },
  { bg: "bg-teal-600 text-white", dot: "bg-white/80" },
];

function parseTime(t: string | null): number | null {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h + m / 60;
}

function formatTipo(tipo: string, codigo: string): string {
  const map: Record<string, string> = {
    teorico: "Teó",
    seminario: "Sem",
    comision: "Com",
  };
  return `${map[tipo] ?? tipo} ${codigo}`;
}

function formatHM(t: string | null): string {
  if (!t) return "";
  return t.slice(0, 5);
}

interface CursoBloqueProps {
  curso: CursoConContexto;
  compacto: boolean;
  top: number;
  height: number;
}

function CursoDetalle({
  curso,
  size = "popover",
}: {
  curso: CursoConContexto;
  size?: "popover" | "drawer";
}) {
  const iconSize = size === "drawer" ? "size-4" : "size-3.5";
  const textCls =
    size === "drawer"
      ? "flex items-center gap-2 text-sm text-muted-foreground"
      : "flex items-center gap-1.5 text-muted-foreground";
  return (
    <div className={size === "drawer" ? "space-y-2.5" : "space-y-1.5"}>
      {size === "popover" && (
        <div className="text-sm font-semibold">{curso.materia_nombre}</div>
      )}
      {curso.sinCupos && (
        <div className="flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-amber-900">
          <AlertTriangle className={cn("shrink-0", iconSize)} />
          <span className="font-medium">Sin cupos disponibles</span>
        </div>
      )}
      <div className={textCls}>
        <Clock className={cn("shrink-0", iconSize)} />
        <span>
          {formatTipo(curso.tipo, curso.codigo)} ·{" "}
          {formatHM(curso.hora_inicio)}–{formatHM(curso.hora_fin)}
        </span>
      </div>
      {curso.aula && (
        <div className={textCls}>
          <DoorOpen className={cn("shrink-0", iconSize)} />
          <span>Aula {curso.aula}</span>
        </div>
      )}
      {curso.profesor && (
        <div className={textCls}>
          <User className={cn("shrink-0", iconSize)} />
          <span>{curso.profesor}</span>
        </div>
      )}
      {curso.sede && (
        <div className={textCls}>
          <MapPin className={cn("shrink-0", iconSize)} />
          <span>{curso.sede}</span>
        </div>
      )}
      {curso.catedra_titular && (
        <div className={textCls}>
          <GraduationCap className={cn("shrink-0", iconSize)} />
          <span>Cátedra: {curso.catedra_titular}</span>
        </div>
      )}
    </div>
  );
}

function CursoBloque({ curso, compacto, top, height }: CursoBloqueProps) {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | null>(null);
  const isTouch = useIsTouchDevice();

  const cancel = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };
  const onEnter = () => {
    cancel();
    setOpen(true);
  };
  const onLeave = () => {
    cancel();
    timer.current = window.setTimeout(() => setOpen(false), 120);
  };

  const bloque = (
    <div
      className={cn(
        "absolute left-1 right-1 cursor-pointer overflow-hidden rounded-md shadow-sm",
        compacto
          ? "flex items-center px-1.5 py-0 text-[10px]"
          : "px-2 py-1.5 text-[11px]",
        curso.materia_color
      )}
      style={{ top, height }}
      onMouseEnter={isTouch ? undefined : onEnter}
      onMouseLeave={isTouch ? undefined : onLeave}
    >
      {curso.sinCupos && (
        <AlertTriangle
          aria-label="Sin cupos disponibles"
          className={cn(
            "absolute right-1 top-1 fill-amber-400 text-amber-900 drop-shadow",
            compacto ? "size-3" : "size-3.5"
          )}
          strokeWidth={2.5}
        />
      )}
      {compacto ? (
        <div className="line-clamp-1 font-medium leading-tight">
          {curso.materia_nombre}
        </div>
      ) : (
        <>
          <div className="line-clamp-1 font-semibold leading-tight">
            {curso.materia_nombre}
          </div>
          <div className="opacity-90 leading-tight">
            {formatTipo(curso.tipo, curso.codigo)} · {formatHM(curso.hora_inicio)}–
            {formatHM(curso.hora_fin)}
          </div>
          {curso.aula && (
            <div className="opacity-80 leading-tight">{curso.aula}</div>
          )}
        </>
      )}
    </div>
  );

  if (isTouch) {
    return (
      <Drawer>
        <DrawerTrigger asChild>{bloque}</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{curso.materia_nombre}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6">
            <CursoDetalle curso={curso} size="drawer" />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={undefined}>
      <PopoverTrigger asChild>{bloque}</PopoverTrigger>
      <PopoverContent
        className="w-auto min-w-[200px] max-w-[280px] p-3 text-xs"
        side="right"
        align="start"
        sideOffset={6}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <CursoDetalle curso={curso} size="popover" />
      </PopoverContent>
    </Popover>
  );
}

export function CalendarioPlan({ plan, compacto = false }: Props) {
  const horaMin = 7;
  const horaMax = 23;
  const PIXELS_PER_HOUR = compacto
    ? PIXELS_PER_HOUR_COMPACTO
    : PIXELS_PER_HOUR_NORMAL;
  const cursos = useMemo<CursoConContexto[]>(() => {
    if (!plan) return [];
    const cs: CursoConContexto[] = [];
    plan.opciones.forEach((op, idx) => {
      const palette = PALETTE[idx % PALETTE.length];
      // Solo la comisión tiene `vacantes` cargado: teóricos/seminarios
      // comparten el cupo de la comisión via comision_obliga.
      const comision = op.cursos.find((c) => c.tipo === "comision");
      const sinCupos =
        comision != null &&
        (comision.vacantes == null || comision.vacantes <= 0);
      op.cursos.forEach((c) => {
        cs.push({
          ...c,
          materia_codigo: op.materia_codigo,
          materia_nombre: op.materia_nombre,
          materia_color: palette.bg,
          catedra_titular: op.catedra_titular,
          sinCupos,
        });
      });
    });
    return cs;
  }, [plan]);

  if (!plan) {
    return (
      <div className="flex min-h-[480px] items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 p-12 text-center">
        <div className="max-w-md space-y-2">
          <p className="text-sm font-medium">Sin plan generado todavía</p>
          <p className="text-xs text-muted-foreground">
            Seleccioná al menos una materia y ajustá las restricciones, después
            apretá "Generar planes" para ver las combinaciones posibles acá.
          </p>
        </div>
      </div>
    );
  }

  const horas = Array.from(
    { length: horaMax - horaMin },
    (_, i) => horaMin + i
  );

  // Agrupar por día
  const cursosPorDia = new Map<string, CursoConContexto[]>();
  DIAS_DISPLAY.forEach((d) => cursosPorDia.set(d.key, []));
  cursos.forEach((c) => {
    if (c.dia && cursosPorDia.has(c.dia)) {
      cursosPorDia.get(c.dia)!.push(c);
    }
  });

  const minBloque = compacto ? 14 : 28;
  const gridCols = compacto
    ? "grid-cols-[72px_repeat(6,1fr)]"
    : "grid-cols-[40px_repeat(6,1fr)] sm:grid-cols-[64px_repeat(6,1fr)]";

  return (
    <div>
      <div className="overflow-x-auto overflow-y-clip">
        <div className="min-w-[560px] rounded-2xl border border-border bg-card sm:min-w-[760px]">
        <div className={cn("grid border-b border-border", gridCols)}>
          <div className="p-3 text-xs font-medium text-muted-foreground" />
          {DIAS_DISPLAY.map((d) => (
            <div
              key={d.key}
              className="p-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {d.short}
            </div>
          ))}
        </div>

        <div className={cn("grid", gridCols)}>
          {/* Columna de horas */}
          <div
            className="relative border-r border-border"
            style={{ height: PIXELS_PER_HOUR * horas.length }}
          >
            {compacto
              ? horas.map((h, i) => (
                  <div
                    key={h}
                    className="absolute inset-x-0 flex items-center justify-end pr-1.5 text-[9px] font-medium leading-none text-muted-foreground"
                    style={{
                      top: i * PIXELS_PER_HOUR,
                      height: PIXELS_PER_HOUR,
                    }}
                  >
                    {String(h).padStart(2, "0")}:00 -{" "}
                    {String(h + 1).padStart(2, "0")}:00
                  </div>
                ))
              : Array.from(
                  { length: horaMax - horaMin + 1 },
                  (_, i) => horaMin + i
                ).map((h, i) => (
                  <div
                    key={h}
                    className="absolute right-0 flex -translate-y-1/2 justify-end pr-1 text-[10px] font-medium text-muted-foreground sm:pr-2"
                    style={{ top: i * PIXELS_PER_HOUR }}
                  >
                    {String(h).padStart(2, "0")}:00
                  </div>
                ))}
          </div>

          {DIAS_DISPLAY.map((d) => {
            const cs = cursosPorDia.get(d.key)!;
            return (
              <div
                key={d.key}
                className="relative border-r border-border last:border-r-0"
                style={{ height: PIXELS_PER_HOUR * horas.length }}
              >
                {/* Líneas de hora */}
                {horas.map((h, i) => (
                  <div
                    key={h}
                    className="absolute inset-x-0 border-b border-border/50"
                    style={{ top: i * PIXELS_PER_HOUR }}
                  />
                ))}
                {/* Bloques de cursos */}
                {cs.map((c) => {
                  const start = parseTime(c.hora_inicio);
                  const end = parseTime(c.hora_fin);
                  if (start === null || end === null) return null;
                  const top = (start - horaMin) * PIXELS_PER_HOUR;
                  const height = Math.max(
                    minBloque,
                    (end - start) * PIXELS_PER_HOUR
                  );
                  return (
                    <CursoBloque
                      key={c.id}
                      curso={c}
                      compacto={compacto}
                      top={top}
                      height={height}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
        </div>
      </div>

      {/* Leyenda */}
      <div className="mt-4 flex flex-wrap gap-2 sm:gap-3">
        {plan.opciones.map((op, idx) => {
          const palette = PALETTE[idx % PALETTE.length];
          return (
            <div
              key={op.materia_codigo}
              className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs"
            >
              <span className={`size-3 rounded-full ${palette.bg}`} />
              <span className="font-medium">{op.materia_nombre}</span>
              <span className="text-muted-foreground">
                · cát {op.catedra_id}
                {op.catedra_titular ? ` (${op.catedra_titular})` : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
