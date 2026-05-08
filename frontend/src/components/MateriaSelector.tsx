import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { MateriaCard } from "@/components/MateriaCard";
import { api } from "@/lib/api";
import type { MateriaListItem, MateriaSeleccionada } from "@/lib/types";

interface SeleccionConNombre extends MateriaSeleccionada {
  nombre: string;
}

interface Props {
  selected: SeleccionConNombre[];
  onChange: (materias: SeleccionConNombre[]) => void;
}

// El default de cmdk usa command-score (fuzzy con tildes y rankings raros);
// con esto hacemos un substring match sobre texto normalizado, que es lo que
// el usuario espera al buscar materias.
function normalizar(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function filtrarMateria(value: string, search: string): number {
  if (!search) return 1;
  const v = normalizar(value);
  const s = normalizar(search.trim());
  if (!s) return 1;
  if (v.startsWith(s)) return 1;
  if (v.includes(s)) return 0.8;
  // Fallback: que aparezcan todas las palabras del search en cualquier orden.
  const palabras = s.split(/\s+/).filter(Boolean);
  if (palabras.length > 1 && palabras.every((p) => v.includes(p))) return 0.5;
  return 0;
}

export function MateriaSelector({ selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [materias, setMaterias] = useState<MateriaListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  // Scroll al tope cada vez que cambia el query. En un useEffect (no en
  // onValueChange) para correr DESPUÉS de que cmdk filtró y reordenó.
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .listMaterias()
      .then((d) => {
        if (!cancelled) setMaterias(d);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedIds = useMemo(
    () => new Set(selected.map((m) => m.codigo)),
    [selected]
  );

  const disponibles = useMemo(
    () => materias.filter((m) => !selectedIds.has(m.codigo)),
    [materias, selectedIds]
  );

  function add(m: MateriaListItem) {
    onChange([
      { codigo: m.codigo, nombre: m.nombre, catedra_id: null, profesores: null },
      ...selected,
    ]);
    setOpen(false);
  }

  function update(codigo: number, patch: Partial<MateriaSeleccionada>) {
    onChange(
      selected.map((m) =>
        m.codigo === codigo ? { ...m, ...patch } : m
      )
    );
  }

  function remove(codigo: number) {
    onChange(selected.filter((m) => m.codigo !== codigo));
  }

  return (
    <div className="flex flex-col gap-3 lg:h-full">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BookOpen className="size-4" />
          <span>
            {selected.length === 0
              ? "Ninguna materia seleccionada"
              : `${selected.length} ${selected.length === 1 ? "materia" : "materias"}`}
          </span>
        </div>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="size-3.5" />
              Agregar materia
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[min(520px,calc(100vw-2rem))] p-0" align="end">
            <Command shouldFilter filter={filtrarMateria}>
              <CommandInput
                placeholder="Buscar materia..."
                onValueChange={setQuery}
              />
              <CommandList ref={listRef}>
                {loading && (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    Cargando materias...
                  </div>
                )}
                {error && (
                  <div className="py-6 text-center text-sm text-destructive">
                    {error}
                  </div>
                )}
                {!loading && !error && (
                  <>
                    <CommandEmpty>No se encontraron materias.</CommandEmpty>
                    <CommandGroup>
                      {disponibles.map((m) => (
                        <CommandItem
                          key={m.codigo}
                          value={`${m.nombre} ${m.codigo}`}
                          onSelect={() => add(m)}
                        >
                          <span className="line-clamp-2 flex-1">{m.nombre}</span>
                          <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                            {m.cant_catedras}{" "}
                            {m.cant_catedras === 1 ? "cát." : "cáts."}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {selected.length > 0 && (
        <div className="space-y-2 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
          {selected.map((m) => (
            <MateriaCard
              key={m.codigo}
              nombre={m.nombre}
              seleccion={m}
              onChange={(s) => update(m.codigo, s)}
              onRemove={() => remove(m.codigo)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
