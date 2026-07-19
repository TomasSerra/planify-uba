import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { updateProfile as updateFirebaseProfile } from "firebase/auth";
import { GraduationCap, Loader2, UserRound } from "lucide-react";

import { api } from "@/lib/api";
import { auth } from "@/lib/firebase";
import { useAlert } from "@/lib/alert";
import { useAuth } from "@/lib/useAuth";
import { CareerContext } from "@/lib/career";
import { useMe } from "@/lib/useMe";
import { DEFAULT_CARRERA, SEDES, type Carrera, type Me } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [editableNameOpen, setEditableNameOpen] = useState(false);

  const isLoadingProfile =
    authLoading || (isAuthenticated && meQuery.isLoading);

  const carrera: string | null = isAuthenticated
    ? meQuery.data?.carrera ?? null
    : anonCarrera;

  const nombre: string | null = isAuthenticated
    ? meQuery.data?.nombre ?? null
    : null;

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

  const profileReady =
    !authLoading &&
    isAuthenticated &&
    !meQuery.isLoading &&
    meQuery.data !== undefined;

  // El nombre se toma automáticamente del displayName (Google, o el que seteamos
  // en el signup por email). Solo caemos al modal forzado si no hay displayName
  // o si esa auto-persistencia falló. Leemos de auth.currentUser porque
  // onAuthStateChanged no re-emite tras updateProfile.
  const [autoSaveError, setAutoSaveError] = useState(false);
  const hasDisplayName = !!auth.currentUser?.displayName?.trim();

  const forcedNameOpen =
    profileReady &&
    meQuery.data!.nombre === null &&
    (!hasDisplayName || autoSaveError);

  // La carrera se pide DESPUÉS de que el nombre exista.
  const forcedCarreraOpen =
    profileReady &&
    meQuery.data!.carrera === null &&
    meQuery.data!.nombre !== null;

  // Update optimista del cache de `/me` para que MateriaSelector y demás
  // consumidores se refresquen al instante, sin esperar al refetch.
  const updateProfileMutation = useMutation({
    mutationFn: async (body: { carrera?: string; nombre?: string }) => {
      const token = await getAccessTokenSilently();
      return api.updateProfile(body, token);
    },
    onSuccess: (resp) => {
      queryClient.setQueryData<Me | undefined>(["me", user?.uid], (old) =>
        old ? { ...old, carrera: resp.carrera, nombre: resp.nombre } : old
      );
    },
  });

  // Auto-persistencia del nombre desde displayName. Un intento por usuario.
  const autoSavedRef = useRef(false);
  useEffect(() => {
    autoSavedRef.current = false;
    setAutoSaveError(false);
  }, [user?.uid]);

  useEffect(() => {
    if (autoSavedRef.current) return;
    if (!profileReady || meQuery.data!.nombre !== null) return;
    const displayName = auth.currentUser?.displayName?.trim();
    if (!displayName) return;
    autoSavedRef.current = true;
    updateProfileMutation.mutate(
      { nombre: displayName },
      { onError: () => setAutoSaveError(true) }
    );
  }, [profileReady, meQuery.data, updateProfileMutation]);

  const setCarrera = useCallback(
    async (slug: string) => {
      if (isAuthenticated) {
        await updateProfileMutation.mutateAsync({ carrera: slug });
      } else {
        localStorage.setItem(LS_KEY, slug);
        setAnonCarrera(slug);
      }
    },
    [isAuthenticated, updateProfileMutation]
  );

  const setNombre = useCallback(
    async (value: string) => {
      await updateProfileMutation.mutateAsync({ nombre: value });
      if (auth.currentUser) {
        await updateFirebaseProfile(auth.currentUser, {
          displayName: value,
        }).catch(() => {
          /* consistencia con Firebase; no bloqueante */
        });
      }
    },
    [updateProfileMutation]
  );

  const openChangeCarrera = useCallback(() => setEditableOpen(true), []);
  const openChangeNombre = useCallback(() => setEditableNameOpen(true), []);

  return (
    <CareerContext.Provider
      value={{
        carrera,
        nombre,
        carreraNombre,
        sedesDisponibles,
        setCarrera,
        openChangeCarrera,
        openChangeNombre,
        isLoading: isLoadingProfile,
      }}
    >
      {children}
      <NombreModal
        open={forcedNameOpen || editableNameOpen}
        mode={forcedNameOpen ? "forced" : "editable"}
        currentNombre={nombre}
        onClose={() => setEditableNameOpen(false)}
        onSave={async (value) => {
          try {
            await setNombre(value);
            setEditableNameOpen(false);
            setAutoSaveError(false);
          } catch (e) {
            showAlert({
              variant: "error",
              title: "No se pudo guardar el nombre",
              message: (e as Error).message,
            });
          }
        }}
      />
      <CareerModal
        open={forcedCarreraOpen || editableOpen}
        mode={forcedCarreraOpen ? "forced" : "editable"}
        carreras={carrerasQuery.data ?? []}
        currentCarrera={carrera}
        initialSlug={forcedCarreraOpen ? anonCarrera : carrera ?? anonCarrera}
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

function NombreModal({
  open,
  mode,
  currentNombre,
  onClose,
  onSave,
}: {
  open: boolean;
  mode: "forced" | "editable";
  currentNombre: string | null;
  onClose: () => void;
  onSave: (nombre: string) => Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setValue(
        mode === "editable"
          ? currentNombre ?? ""
          : auth.currentUser?.displayName ?? ""
      );
    }
  }, [open, mode, currentNombre]);

  const trimmed = value.trim();

  async function handleSave() {
    if (!trimmed) return;
    setSaving(true);
    try {
      await onSave(trimmed);
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
            <UserRound className="size-5 text-[#861f5c]" />
            {mode === "forced" ? "¿Cómo te llamás?" : "Cambiar nombre"}
          </DialogTitle>
          <DialogDescription>
            {mode === "forced"
              ? "Completá tu nombre para terminar de crear tu cuenta."
              : "Actualizá el nombre que se muestra en tu cuenta."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSave();
          }}
          className="flex flex-col gap-3 py-1"
        >
          <Input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Nombre y apellido"
            maxLength={100}
          />
          <Button
            type="submit"
            size="lg"
            className="w-full bg-[#861f5c] text-white hover:bg-[#861f5c]/90"
            disabled={!trimmed || saving || trimmed === currentNombre}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Guardar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
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
