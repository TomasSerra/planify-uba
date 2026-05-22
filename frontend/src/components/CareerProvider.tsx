import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GraduationCap, Loader2 } from "lucide-react";

import { api } from "@/lib/api";
import { useAlert } from "@/lib/alert";
import { useAuth } from "@/lib/useAuth";
import { CareerContext } from "@/lib/career";
import { useMe } from "@/lib/useMe";
import { DEFAULT_CARRERA, SEDES, type Carrera, type Me } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const LS_KEY = "carrera";

export function CareerProvider({ children }: { children: ReactNode }) {
  const {
    user,
    isAuthenticated,
    isLoading: authLoading,
    getAccessTokenSilently,
  } = useAuth();
  const queryClient = useQueryClient();
  const showAlert = useAlert();

  const [anonCarrera, setAnonCarrera] = useState<string>(() => {
    if (typeof window === "undefined") return DEFAULT_CARRERA;
    return localStorage.getItem(LS_KEY) || DEFAULT_CARRERA;
  });

  const meQuery = useMe();

  const carrerasQuery = useQuery({
    queryKey: ["carreras"],
    queryFn: () => api.listCarreras(),
    staleTime: Infinity,
  });

  const [editableOpen, setEditableOpen] = useState(false);

  const isLoadingProfile =
    authLoading || (isAuthenticated && meQuery.isLoading);

  const carrera: string | null = isAuthenticated
    ? meQuery.data?.carrera ?? null
    : anonCarrera;

  const carreraActual =
    carrera && carrerasQuery.data
      ? carrerasQuery.data.find((c) => c.slug === carrera)
      : undefined;

  const carreraNombre = carreraActual?.nombre ?? null;

  // Si todavía no cargó /carreras, mostramos todas las sedes como fallback —
  // evita un primer render con el panel vacío. Una vez que llega el data
  // real, se filtra a las sedes efectivas.
  const sedesDisponibles = carreraActual
    ? SEDES.filter((s) => carreraActual.sedes.includes(s.codigo))
    : SEDES;

  const forcedOpen =
    !authLoading &&
    isAuthenticated &&
    !meQuery.isLoading &&
    meQuery.data !== undefined &&
    meQuery.data.carrera === null;

  // Update optimista del cache de `/me` para que MateriaSelector y demás
  // consumidores se refresquen al instante, sin esperar al refetch.
  const updateCarreraMutation = useMutation({
    mutationFn: async (slug: string) => {
      const token = await getAccessTokenSilently();
      return api.updateProfile(slug, token);
    },
    onSuccess: (resp) => {
      queryClient.setQueryData<Me | undefined>(["me", user?.uid], (old) =>
        old ? { ...old, carrera: resp.carrera } : old
      );
    },
  });

  const setCarrera = useCallback(
    async (slug: string) => {
      if (isAuthenticated) {
        await updateCarreraMutation.mutateAsync(slug);
      } else {
        localStorage.setItem(LS_KEY, slug);
        setAnonCarrera(slug);
      }
    },
    [isAuthenticated, updateCarreraMutation]
  );

  const openChangeCarrera = useCallback(() => setEditableOpen(true), []);

  return (
    <CareerContext.Provider
      value={{
        carrera,
        carreraNombre,
        sedesDisponibles,
        setCarrera,
        openChangeCarrera,
        isLoading: isLoadingProfile,
      }}
    >
      {children}
      <CareerModal
        open={forcedOpen || editableOpen}
        mode={forcedOpen ? "forced" : "editable"}
        carreras={carrerasQuery.data ?? []}
        currentCarrera={carrera}
        initialSlug={forcedOpen ? anonCarrera : carrera ?? anonCarrera}
        onClose={() => setEditableOpen(false)}
        onSave={async (slug) => {
          try {
            await setCarrera(slug);
            setEditableOpen(false);
          } catch (e) {
            showAlert({
              variant: "error",
              title: "No se pudo guardar la carrera",
              message: (e as Error).message,
            });
          }
        }}
      />
    </CareerContext.Provider>
  );
}

function CareerModal({
  open,
  mode,
  carreras,
  currentCarrera,
  initialSlug,
  onClose,
  onSave,
}: {
  open: boolean;
  mode: "forced" | "editable";
  carreras: Carrera[];
  currentCarrera: string | null;
  initialSlug: string | null;
  onClose: () => void;
  onSave: (slug: string) => Promise<void>;
}) {
  const [pick, setPick] = useState<string | null>(initialSlug);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setPick(initialSlug ?? currentCarrera ?? DEFAULT_CARRERA);
  }, [open, initialSlug, currentCarrera]);

  async function handleSave() {
    if (!pick) return;
    setSaving(true);
    try {
      await onSave(pick);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (mode === "forced") return;
        if (!v) onClose();
      }}
    >
      <DialogContent
        hideClose={mode === "forced"}
        onPointerDownOutside={(e) => {
          if (mode === "forced") e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (mode === "forced") e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="size-5 text-[#861f5c]" />
            {mode === "forced" ? "¿De qué carrera sos?" : "Cambiar carrera"}
          </DialogTitle>
          <DialogDescription>
            {mode === "forced"
              ? "Elegí tu carrera para mostrarte solo las materias que te corresponden. Lo podés cambiar después desde tu perfil."
              : "Cambiá la carrera para ver las materias de otra cursada."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 py-1">
          {carreras.length === 0 ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            carreras.map((c) => {
              const selected = pick === c.slug;
              return (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => setPick(c.slug)}
                  className={
                    "flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors " +
                    (selected
                      ? "border-[#861f5c] bg-[#861f5c]/5 font-medium"
                      : "border-input hover:bg-accent")
                  }
                >
                  <span className="flex-1">{c.nombre}</span>
                  {selected && (
                    <span className="size-2 rounded-full bg-[#861f5c]" />
                  )}
                </button>
              );
            })
          )}
        </div>

        <Button
          size="lg"
          className="w-full bg-[#861f5c] text-white hover:bg-[#861f5c]/90"
          onClick={handleSave}
          disabled={!pick || saving || pick === currentCarrera}
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          Guardar
        </Button>
      </DialogContent>
    </Dialog>
  );
}
