import { useEffect, useMemo, useState } from "react";
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

export function MateriaSelector({ selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [materias, setMaterias] = useState<MateriaListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      ...selected,
      { codigo: m.codigo, nombre: m.nombre, catedra_id: null, profesores: null },
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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
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
          <PopoverContent className="w-[520px] p-0" align="end">
            <Command shouldFilter>
              <CommandInput placeholder="Buscar materia..." />
              <CommandList>
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
        <div className="space-y-2">
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
