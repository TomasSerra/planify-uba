import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  X,
  Loader2,
  Users,
  GraduationCap,
  Gem,
  MapPin,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useSubscription } from "@/lib/useSubscription";
import { usePaywall } from "@/lib/paywall";
import { SEDES } from "@/lib/types";
import type {
  CatedraOpcion,
  MateriaOpciones,
  MateriaSeleccionada,
} from "@/lib/types";

interface Props {
  nombre: string;
  seleccion: MateriaSeleccionada;
  onChange: (s: MateriaSeleccionada) => void;
  onRemove: () => void;
}

export function MateriaCard({ nombre, seleccion, onChange, onRemove }: Props) {
  const { isPaid, isLoading: subLoading } = useSubscription();
  const openPaywall = usePaywall();
  const [opciones, setOpciones] = useState<MateriaOpciones | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getMateriaOpciones(seleccion.codigo)
      .then((d) => {
        if (!cancelled) setOpciones(d);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [seleccion.codigo]);

  // Profesores disponibles según la cátedra elegida (o unión de todas).
  const profesoresDisponibles = useMemo(() => {
    if (!opciones) return [];
    const filtradas = seleccion.catedra_id
      ? opciones.catedras.filter((c) => c.id === seleccion.catedra_id)
      : opciones.catedras;
    const set = new Set<string>();
    filtradas.forEach((c) => c.profesores.forEach((p) => set.add(p)));
    return Array.from(set).sort();
  }, [opciones, seleccion.catedra_id]);

  // Si cambió la cátedra y los profesores seleccionados ya no son válidos,
  // sanitizo. null = todos (no hay nada que sanitizar).
  useEffect(() => {
    if (seleccion.profesores === null) return;
    if (seleccion.profesores.length === 0) return;
    const validos = new Set(profesoresDisponibles);
    const filtrados = seleccion.profesores.filter((p) => validos.has(p));
    if (filtrados.length !== seleccion.profesores.length) {
      onChange({ ...seleccion, profesores: filtrados });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profesoresDisponibles]);

  const catedraSeleccionada = opciones?.catedras.find(
    (c) => c.id === seleccion.catedra_id
  );

  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold leading-tight">{nombre}</h3>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="Quitar materia"
        >
          <X className="size-4" />
        </button>
      </div>

      {loading && (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Cargando opciones...
        </div>
      )}

      {error && (
        <p className="mt-3 text-xs text-destructive">{error}</p>
      )}

      {opciones && (
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              Cátedra
            </p>
            {subLoading ? (
              <Skeleton className="h-9 w-full rounded-lg" />
            ) : (
              <CatedraDropdown
                catedras={opciones.catedras}
                selected={seleccion.catedra_id}
                onSelect={(id) => onChange({ ...seleccion, catedra_id: id })}
              />
            )}
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              Profesores
            </p>
            {subLoading ? (
              <Skeleton className="h-9 w-full rounded-lg" />
            ) : (
              <ProfesoresDropdown
                profesores={profesoresDisponibles}
                selected={seleccion.profesores}
                onChange={(profs) => onChange({ ...seleccion, profesores: profs })}
                catedraLabel={catedraSeleccionada?.titular ?? null}
                disabled={!isPaid}
                onLockedClick={() => openPaywall("profesores")}
              />
            )}
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              Sede
            </p>
            {subLoading ? (
              <Skeleton className="h-9 w-full rounded-lg" />
            ) : (
              <SedeDropdown
                selected={seleccion.sede ?? null}
                onSelect={(sede) => onChange({ ...seleccion, sede })}
                disabled={!isPaid}
                onLockedClick={() => openPaywall("filtros")}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CatedraDropdown({
  catedras,
  selected,
  onSelect,
}: {
  catedras: CatedraOpcion[];
  selected: number | null;
  onSelect: (id: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const sel = catedras.find((c) => c.id === selected);
  const label = sel
    ? `Cát ${sel.numero ?? sel.id}${sel.titular ? ` · ${sel.titular}` : ""}`
    : `Todas (${catedras.length})`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-full items-center gap-2 rounded-lg border border-input bg-white px-3 text-left text-xs font-medium transition-colors hover:bg-accent"
        >
          <GraduationCap className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate">{label}</span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(20rem,calc(100vw-2rem))] p-1" align="start">
        <button
          type="button"
          onClick={() => {
            onSelect(null);
            setOpen(false);
          }}
          className={
            "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent " +
            (selected === null ? "bg-accent font-medium" : "")
          }
        >
          <span>Todas las cátedras</span>
          <span className="ml-auto text-xs text-muted-foreground">
            {catedras.length}
          </span>
        </button>
        <Separator className="my-1" />
        {catedras.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              onSelect(c.id);
              setOpen(false);
            }}
            className={
              "flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent " +
              (selected === c.id ? "bg-accent" : "")
            }
          >
            <span className="font-medium">
              Cát {c.numero ?? c.id}
              {c.titular ? <> · <span className="font-normal">{c.titular}</span></> : null}
            </span>
            <span className="text-xs text-muted-foreground">
              {c.profesores.length} profesores en comisiones
            </span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function ProfesoresDropdown({
  profesores,
  selected,
  onChange,
  catedraLabel,
  disabled,
  onLockedClick,
}: {
  profesores: string[];
  selected: string[] | null;
  onChange: (profs: string[] | null) => void;
  catedraLabel: string | null;
  disabled?: boolean;
  onLockedClick?: () => void;
}) {
  const [open, setOpen] = useState(false);

  // Estados:
  //   selected === null            -> todos (sentinel)
  //   selected.length === 0        -> ninguno explícito
  //   selected.length === all      -> todos materializado (también cuenta como "todos")
  //   subset                       -> selección parcial
  const allSelected =
    selected === null ||
    (selected.length === profesores.length && profesores.length > 0);
  const noneSelected = selected !== null && selected.length === 0;

  const label = allSelected
    ? `Todos (${profesores.length})`
    : noneSelected
    ? "Ninguno"
    : `${selected!.length} de ${profesores.length}`;

  if (disabled) {
    return (
      <button
        type="button"
        onClick={onLockedClick}
        title="Hacete Pro para filtrar profesores"
        className="flex h-9 w-full items-center gap-2 rounded-lg border border-input bg-muted/40 px-3 text-left text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
      >
        <Users className="size-3.5 shrink-0" />
        <span className="flex-1 truncate">{label}</span>
        <Gem className="size-3.5 shrink-0 text-[#EC990B]" />
      </button>
    );
  }

  function toggle(prof: string) {
    if (selected === null) {
      // Estaban todos implícitamente; pasamos a modo explícito sin éste.
      onChange(profesores.filter((p) => p !== prof));
      return;
    }
    if (selected.includes(prof)) {
      onChange(selected.filter((p) => p !== prof));
    } else {
      onChange([...selected, prof]);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-full items-center gap-2 rounded-lg border border-input bg-white px-3 text-left text-xs font-medium transition-colors hover:bg-accent"
        >
          <Users className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate">{label}</span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(20rem,calc(100vw-2rem))] p-2" align="start">
        <p className="px-2 pb-2 text-xs text-muted-foreground">
          {catedraLabel
            ? `Profesores de ${catedraLabel}.`
            : "Profesores de todas las cátedras."}
        </p>
        <div className="flex items-center justify-end gap-2 px-1 pb-2">
          <button
            type="button"
            onClick={() =>
              allSelected ? onChange([]) : onChange(null)
            }
            disabled={profesores.length === 0}
            className="text-xs text-primary disabled:cursor-not-allowed disabled:text-muted-foreground"
          >
            {allSelected ? "Deseleccionar todos" : "Seleccionar todos"}
          </button>
        </div>
        <div className="max-h-72 overflow-y-auto pr-1">
          {profesores.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              No hay profesores disponibles.
            </p>
          ) : (
            profesores.map((p) => {
              const isSelected =
                selected === null ? true : selected.includes(p);
              return (
                <label
                  key={p}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent"
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggle(p)}
                  />
                  <span className="flex-1 truncate">{p}</span>
                </label>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SedeDropdown({
  selected,
  onSelect,
  disabled,
  onLockedClick,
}: {
  selected: string | null;
  onSelect: (sede: string | null) => void;
  disabled?: boolean;
  onLockedClick?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const sel = SEDES.find((s) => s.codigo === selected);
  const label = sel ? `${sel.nombre} (${sel.codigo})` : "Cualquiera";

  if (disabled) {
    return (
      <button
        type="button"
        onClick={onLockedClick}
        title="Hacete Pro para forzar una sede"
        className="flex h-9 w-full items-center gap-2 rounded-lg border border-input bg-muted/40 px-3 text-left text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
      >
        <MapPin className="size-3.5 shrink-0" />
        <span className="flex-1 truncate">{label}</span>
        <Gem className="size-3.5 shrink-0 text-[#EC990B]" />
      </button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-full items-center gap-2 rounded-lg border border-input bg-white px-3 text-left text-xs font-medium transition-colors hover:bg-accent"
        >
          <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate">{label}</span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(20rem,calc(100vw-2rem))] p-1" align="start">
        <button
          type="button"
          onClick={() => {
            onSelect(null);
            setOpen(false);
          }}
          className={
            "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent " +
            (selected === null ? "bg-accent font-medium" : "")
          }
        >
          <span>Cualquier sede</span>
        </button>
        <Separator className="my-1" />
        {SEDES.map((s) => (
          <button
            key={s.codigo}
            type="button"
            onClick={() => {
              onSelect(s.codigo);
              setOpen(false);
            }}
            className={
              "flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent " +
              (selected === s.codigo ? "bg-accent font-medium" : "")
            }
          >
            <span>{s.nombre}</span>
            <span className="text-xs text-muted-foreground">{s.codigo}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
