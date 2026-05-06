import { useMemo } from "react";
import type { Plan, CursoEnPlan } from "@/lib/types";

const DIAS_DISPLAY = [
  { key: "lunes", short: "Lun" },
  { key: "martes", short: "Mar" },
  { key: "miercoles", short: "Mié" },
  { key: "jueves", short: "Jue" },
  { key: "viernes", short: "Vie" },
  { key: "sabado", short: "Sáb" },
];

const PIXELS_PER_HOUR = 32;

interface CursoConContexto extends CursoEnPlan {
  materia_codigo: number;
  materia_nombre: string;
  materia_color: string;
  catedra_titular: string | null;
}

interface Props {
  plan: Plan | null;
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

export function CalendarioPlan({ plan }: Props) {
  const horaMin = 7;
  const horaMax = 23;
  const cursos = useMemo<CursoConContexto[]>(() => {
    if (!plan) return [];
    const cs: CursoConContexto[] = [];
    plan.opciones.forEach((op, idx) => {
      const palette = PALETTE[idx % PALETTE.length];
      op.cursos.forEach((c) => {
        cs.push({
          ...c,
          materia_codigo: op.materia_codigo,
          materia_nombre: op.materia_nombre,
          materia_color: palette.bg,
          catedra_titular: op.catedra_titular,
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

  return (
    <div className="overflow-auto max-h-[90dvh]">
      <div className="min-w-[760px] rounded-2xl border border-border bg-card">
        <div className="grid grid-cols-[64px_repeat(6,1fr)] border-b border-border">
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

        <div className="grid grid-cols-[64px_repeat(6,1fr)]">
          {/* Columna de horas: una etiqueta más que bloques (incluye horaMax) */}
          <div
            className="relative border-r border-border"
            style={{ height: PIXELS_PER_HOUR * horas.length }}
          >
            {Array.from({ length: horaMax - horaMin + 1 }, (_, i) => horaMin + i).map(
              (h, i) => (
                <div
                  key={h}
                  className="absolute right-0 flex -translate-y-1/2 justify-end pr-2 text-[10px] font-medium text-muted-foreground"
                  style={{ top: i * PIXELS_PER_HOUR }}
                >
                  {String(h).padStart(2, "0")}:00
                </div>
              )
            )}
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
                  const height = Math.max(28, (end - start) * PIXELS_PER_HOUR);
                  return (
                    <div
                      key={c.id}
                      className={
                        "absolute left-1 right-1 overflow-hidden rounded-md px-2 py-1.5 text-[11px] shadow-sm " +
                        c.materia_color
                      }
                      style={{ top, height }}
                      title={`${c.materia_nombre} — ${formatTipo(c.tipo, c.codigo)} — ${c.aula ?? ""}`}
                    >
                      <div className="line-clamp-2 font-semibold leading-tight">
                        {c.materia_nombre}
                      </div>
                      <div className="opacity-90 leading-tight">
                        {formatTipo(c.tipo, c.codigo)} · {formatHM(c.hora_inicio)}–
                        {formatHM(c.hora_fin)}
                      </div>
                      {c.aula && (
                        <div className="opacity-80 leading-tight">{c.aula}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Leyenda */}
      <div className="mt-4 flex flex-wrap gap-3">
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
