import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Gem,
  XCircle,
  Heart,
  ChevronDown,
} from "lucide-react";
import mpIcon from "@/assets/mp-icon.png";
import { useAuth0 } from "@auth0/auth0-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MateriaSelector } from "@/components/MateriaSelector";
import { RestriccionesPanel } from "@/components/RestriccionesPanel";
import { CalendarioPlan } from "@/components/CalendarioPlan";
import { PlanNavigator } from "@/components/PlanNavigator";
import { Header } from "@/components/Header";
import { HistorialPopover } from "@/components/HistorialPopover";
import { FREE_MAX_PLANES, PRO_MAX_PLANES } from "@/components/PaywallProvider";
import { api } from "@/lib/api";
import { pushHistory } from "@/lib/planHistory";
import { useSubscription } from "@/lib/useSubscription";
import { usePaywall } from "@/lib/paywall";
import { useAlert } from "@/lib/alert";
import {
  DIAS,
  type FavoriteFilters,
  type FranjaExcluida,
  type MateriaSeleccionada,
  type Plan,
  type PlanHistoryEntry,
  type PlanResponse,
} from "@/lib/types";

interface SeleccionConNombre extends MateriaSeleccionada {
  nombre: string;
}

interface PagoErrorState {
  status: string | null;
  statusDetail: string | null;
}

function PagoErrorDialog({
  state,
  onClose,
}: {
  state: PagoErrorState | null;
  onClose: () => void;
}) {
  const { getAccessTokenSilently } = useAuth0();
  const showAlert = useAlert();
  const [retrying, setRetrying] = useState(false);

  async function reintentar() {
    setRetrying(true);
    try {
      const token = await getAccessTokenSilently();
      if (!token) throw new Error("No token");
      const { init_point } = await api.postCheckout(token);
      window.location.href = init_point;
    } catch (e) {
      setRetrying(false);
      showAlert({
        variant: "error",
        title: "No se pudo iniciar el pago",
        message: (e as Error).message,
      });
    }
  }

  const status = state?.status;
  const statusDetail = state?.statusDetail;
  const hasStatus = status && status !== "null";
  const hasDetail = statusDetail && statusDetail !== "null";

  return (
    <Dialog open={state !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <div className="flex flex-col items-center pt-2 text-center">
          <XCircle className="size-12 text-destructive" strokeWidth={1.5} />
          <DialogHeader className="mt-3 space-y-2 sm:text-center">
            <DialogTitle className="text-center">
              El pago no se procesó
            </DialogTitle>
            <DialogDescription className="text-center">
              Mercado Pago rechazó la transacción
              {hasStatus ? ` (${status})` : ""}
              {hasDetail ? `: ${statusDetail}` : ""}. No se descontó plata.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          <Button
            onClick={reintentar}
            disabled={retrying}
            className="bg-[#EC990B] text-white hover:bg-[#EC990B]/90"
          >
            {retrying ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <img src={mpIcon} alt="" className="h-4 w-auto" />
            )}
            Reintentar pago
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const PAGO_POLL_INTERVAL_MS = 2000;
const PAGO_MAX_WAIT_MS = 30_000;

function PagoStatusDialog({
  externalReference,
  onClose,
}: {
  externalReference: string | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [startedAt] = useState(() => Date.now());

  const { data, error } = useQuery({
    queryKey: ["pago-status", externalReference],
    queryFn: () => {
      if (!externalReference) throw new Error("Falta external_reference");
      return api.getPagoStatus(externalReference);
    },
    enabled: !!externalReference,
    refetchInterval: (q) => {
      if (q.state.data?.status === "approved") return false;
      if (Date.now() - startedAt > PAGO_MAX_WAIT_MS) return false;
      return PAGO_POLL_INTERVAL_MS;
    },
  });

  useEffect(() => {
    if (data?.status === "approved") {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      const t = setTimeout(onClose, 1500);
      return () => clearTimeout(t);
    }
  }, [data?.status, queryClient, onClose]);

  const open = !!externalReference;
  const timedOut = Date.now() - startedAt > PAGO_MAX_WAIT_MS;

  let icon: React.ReactNode;
  let title: string;
  let body: string;
  if (error) {
    icon = <AlertCircle className="size-12 text-destructive" strokeWidth={1.5} />;
    title = "Error confirmando el pago";
    body = (error as Error).message;
  } else if (data?.status === "approved") {
    icon = (
      <CheckCircle2 className="size-12 text-emerald-600" strokeWidth={1.5} />
    );
    title = "¡Listo! Pago acreditado";
    body = "Ya tenés acceso Pro.";
  } else if (timedOut) {
    icon = <AlertCircle className="size-12 text-amber-600" strokeWidth={1.5} />;
    title = "El pago se está acreditando";
    body =
      "Mercado Pago a veces tarda unos minutos. Cuando se acredite, vas a ver el chip Pro en el header.";
  } else {
    icon = <Loader2 className="size-12 animate-spin text-primary" strokeWidth={1.5} />;
    title = "Confirmando tu pago…";
    body = "Esto puede tardar unos segundos.";
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <div className="flex flex-col items-center pt-2 text-center">
          {icon}
          <DialogHeader className="mt-3 space-y-2 sm:text-center">
            <DialogTitle className="text-center">{title}</DialogTitle>
            <DialogDescription className="text-center">{body}</DialogDescription>
          </DialogHeader>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SaveFavoriteButton({
  plan,
  filters,
  isPaid,
  onLockedClick,
}: {
  plan: Plan;
  filters: FavoriteFilters;
  isPaid: boolean;
  onLockedClick: () => void;
}) {
  const { getAccessTokenSilently } = useAuth0();
  const showAlert = useAlert();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null);

  // Plan distinto = botón vuelve a estado inicial.
  const planKey = useMemo(
    () => JSON.stringify(plan.opciones.map((o) => o.cursos.map((c) => c.id).sort())),
    [plan]
  );
  const [keyAtSave, setKeyAtSave] = useState<string | null>(null);
  const isSaved = savedId !== null && keyAtSave === planKey;

  if (!isPaid) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onLockedClick}
        title="Hacete Pro para guardar favoritos"
      >
        <Heart className="size-4" />
        Guardar
        <Gem className="size-3.5 text-[#EC990B]" />
      </Button>
    );
  }

  async function toggle() {
    setBusy(true);
    try {
      const token = await getAccessTokenSilently();
      if (isSaved && savedId !== null) {
        await api.deleteFavorito(savedId, token);
        setSavedId(null);
        setKeyAtSave(null);
      } else {
        const { id } = await api.addFavorito(plan, filters, token);
        setSavedId(id);
        setKeyAtSave(planKey);
      }
      queryClient.invalidateQueries({ queryKey: ["favoritos"] });
    } catch (e) {
      showAlert({
        variant: "error",
        title: isSaved ? "No se pudo eliminar" : "No se pudo guardar",
        message: (e as Error).message,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggle}
      disabled={busy}
      className={
        isSaved
          ? "border-red-500 bg-red-500 text-white hover:bg-red-500/90 hover:text-white"
          : ""
      }
    >
      {busy ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Heart
          className={"size-4 " + (isSaved ? "fill-current" : "")}
        />
      )}
      {isSaved ? "Guardado" : "Guardar"}
    </Button>
  );
}

const ALL_DIAS: string[] = [...DIAS];

interface UrlState {
  m: { c: number; ca: number | null; p: string[] | null }[];
  d: string[];
  f: FranjaExcluida[];
  s: string[];
}

function encodeUrlState(s: UrlState): string {
  return encodeURIComponent(JSON.stringify(s));
}

function decodeUrlState(raw: string): UrlState | null {
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    if (!parsed || !Array.isArray(parsed.m)) return null;
    return parsed as UrlState;
  } catch {
    return null;
  }
}

export function Home() {
  const { isPaid, isLoading: subLoading } = useSubscription();
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();
  const showAlert = useAlert();
  const openPaywall = usePaywall();

  // Si MP redirigió a /pago-error o /pago-exitoso, abrimos un dialog encima
  // de Home y limpiamos la URL para que reload no re-dispare el dialog.
  const location = useLocation();
  const navigate = useNavigate();
  const [pagoError, setPagoError] = useState<PagoErrorState | null>(null);
  const [pagoExternalRef, setPagoExternalRef] = useState<string | null>(null);
  useEffect(() => {
    if (location.pathname === "/pago-error") {
      const params = new URLSearchParams(location.search);
      setPagoError({
        status: params.get("status"),
        statusDetail: params.get("status_detail"),
      });
      navigate("/", { replace: true });
    } else if (location.pathname === "/pago-exitoso") {
      const params = new URLSearchParams(location.search);
      const ref = params.get("ref");
      if (ref) setPagoExternalRef(ref);
      navigate("/", { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  const [materias, setMaterias] = useState<SeleccionConNombre[]>([]);
  // Por default: todos los días marcados (= sin restricción).
  const [diasPermitidos, setDiasPermitidos] = useState<string[]>(ALL_DIAS);
  const [franjas, setFranjas] = useState<FranjaExcluida[]>([]);
  const [sedesPermitidas, setSedesPermitidas] = useState<string[]>([]);
  const [filtrosOpen, setFiltrosOpen] = useState(false);

  // Hidratar materias + filtros desde ?q=… (URL compartible) y disparar
  // generación una sola vez cuando auth/sub terminan de cargar.
  const urlLoadedRef = useRef(false);
  const { isLoading: authLoading } = useAuth0();
  useEffect(() => {
    if (urlLoadedRef.current) return;
    if (location.pathname !== "/") return;
    if (authLoading || subLoading) return;
    // Marcar ya como cargado: si no hay ?q= no hay nada que hidratar, y si lo
    // hay vamos a hidratar ahora. En ambos casos, los navigate() posteriores
    // de runGenerate no deben re-disparar este efecto.
    urlLoadedRef.current = true;
    const q = new URLSearchParams(location.search).get("q");
    if (!q) return;
    const decoded = decodeUrlState(q);
    if (!decoded) return;
    (async () => {
      try {
        const all = await api.listMaterias();
        const byCodigo = new Map(all.map((m) => [m.codigo, m.nombre]));
        const seleccion: SeleccionConNombre[] = decoded.m.map((x) => ({
          codigo: x.c,
          catedra_id: x.ca,
          profesores: x.p,
          nombre: byCodigo.get(x.c) ?? `Materia ${x.c}`,
        }));
        setMaterias(seleccion);
        setDiasPermitidos(decoded.d);
        setFranjas(decoded.f);
        setSedesPermitidas(decoded.s);
        await runGenerate(seleccion, decoded.d, decoded.f, decoded.s);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, subLoading, location.pathname, location.search]);

  const [resultado, setResultado] = useState<PlanResponse | null>(null);
  const [planIdx, setPlanIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastGeneratedSignature, setLastGeneratedSignature] = useState<
    string | null
  >(null);
  const [lastGeneratedFilters, setLastGeneratedFilters] =
    useState<FavoriteFilters | null>(null);

  const currentSignature = useMemo(
    () =>
      JSON.stringify({
        materias: materias.map(({ codigo, catedra_id, profesores }) => ({
          codigo,
          catedra_id,
          profesores,
        })),
        diasPermitidos: [...diasPermitidos].sort(),
        franjas,
        sedesPermitidas: [...sedesPermitidas].sort(),
      }),
    [materias, diasPermitidos, franjas, sedesPermitidas]
  );

  const sinCambios =
    lastGeneratedSignature !== null && currentSignature === lastGeneratedSignature;

  async function runGenerate(
    seleccion: SeleccionConNombre[],
    dias: string[],
    franjasExcl: FranjaExcluida[],
    sedes: string[]
  ) {
    if (seleccion.length === 0) return;
    setLoading(true);
    setError(null);
    setResultado(null);
    setPlanIdx(0);
    try {
      const dias_excluidos = ALL_DIAS.filter((d) => !dias.includes(d));
      const token = isAuthenticated
        ? await getAccessTokenSilently().catch(() => null)
        : null;
      const data = await api.postPlanes(
        {
          materias: seleccion.map(({ codigo, catedra_id, profesores }) => ({
            codigo,
            catedra_id,
            profesores,
          })),
          dias_excluidos,
          franjas_excluidas: franjasExcl,
          sedes_permitidas: sedes,
          max_planes: isPaid ? PRO_MAX_PLANES : FREE_MAX_PLANES,
        },
        token
      );
      setResultado(data);
      const sig = JSON.stringify({
        materias: seleccion.map(({ codigo, catedra_id, profesores }) => ({
          codigo,
          catedra_id,
          profesores,
        })),
        diasPermitidos: [...dias].sort(),
        franjas: franjasExcl,
        sedesPermitidas: [...sedes].sort(),
      });
      setLastGeneratedSignature(sig);
      const filtersSnapshot: FavoriteFilters = {
        dias_excluidos,
        franjas_excluidas: franjasExcl,
        sedes_permitidas: sedes,
        materias: seleccion.map((m) => ({
          codigo: m.codigo,
          nombre: m.nombre,
          catedra_id: m.catedra_id,
          catedra_label: null,
          profesores: m.profesores,
        })),
      };
      setLastGeneratedFilters(filtersSnapshot);
      pushHistory({
        request: {
          materias: seleccion.map(({ codigo, catedra_id, profesores }) => ({
            codigo,
            catedra_id,
            profesores,
          })),
          dias_excluidos,
          franjas_excluidas: franjasExcl,
          sedes_permitidas: sedes,
          max_planes: isPaid ? PRO_MAX_PLANES : FREE_MAX_PLANES,
        },
        filters: filtersSnapshot,
        response: data,
      });
      const q = encodeUrlState({
        m: seleccion.map((m) => ({
          c: m.codigo,
          ca: m.catedra_id,
          p: m.profesores,
        })),
        d: dias,
        f: franjasExcl,
        s: sedes,
      });
      navigate(`/?q=${q}`, { replace: true });
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.startsWith("403")) {
        // Solo se llega acá bypasseando el FE (cualquier filtro Pro debería
        // estar deshabilitado). Tratamos como intento de manipulación.
        showAlert({
          variant: "warning",
          title: "Acción bloqueada",
          message:
            "Detectamos un intento de usar filtros Pro sin suscripción. " +
            "Si querés desbloquear los filtros, hacete Pro.",
        });
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  function generar() {
    return runGenerate(materias, diasPermitidos, franjas, sedesPermitidas);
  }

  function restoreFromHistory(entry: PlanHistoryEntry) {
    const seleccion: SeleccionConNombre[] = entry.filters.materias.map((m) => ({
      codigo: m.codigo,
      nombre: m.nombre,
      catedra_id: m.catedra_id,
      profesores: m.profesores,
    }));
    const dias = ALL_DIAS.filter(
      (d) => !entry.filters.dias_excluidos.includes(d)
    );
    setMaterias(seleccion);
    setDiasPermitidos(dias);
    setFranjas(entry.filters.franjas_excluidas);
    setSedesPermitidas(entry.filters.sedes_permitidas);
    setResultado(entry.response);
    setPlanIdx(0);
    setError(null);
    setLastGeneratedSignature(
      JSON.stringify({
        materias: seleccion.map(({ codigo, catedra_id, profesores }) => ({
          codigo,
          catedra_id,
          profesores,
        })),
        diasPermitidos: [...dias].sort(),
        franjas: entry.filters.franjas_excluidas,
        sedesPermitidas: [...entry.filters.sedes_permitidas].sort(),
      })
    );
    setLastGeneratedFilters(entry.filters);
    const q = encodeUrlState({
      m: seleccion.map((m) => ({
        c: m.codigo,
        ca: m.catedra_id,
        p: m.profesores,
      })),
      d: dias,
      f: entry.filters.franjas_excluidas,
      s: entry.filters.sedes_permitidas,
    });
    navigate(`/?q=${q}`, { replace: true });
  }

  const planActual = resultado?.planes[planIdx] ?? null;
  const sinResultados = resultado && resultado.planes.length === 0;
  const materiasNombres = (codigos: number[]) =>
    codigos
      .map((c) => materias.find((m) => m.codigo === c)?.nombre ?? `#${c}`)
      .join(", ");

  return (
    <div className="min-h-screen bg-background">
      <PagoErrorDialog state={pagoError} onClose={() => setPagoError(null)} />
      <PagoStatusDialog
        externalReference={pagoExternalRef}
        onClose={() => setPagoExternalRef(null)}
      />
      <Header />

      <main className="container space-y-6 px-4 pb-24 pt-8 sm:px-6 sm:pb-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:grid-rows-[1fr_auto]">
          <div className="flex gap-3">
            <HistorialPopover onRestore={restoreFromHistory} />
            <div className="relative min-w-0 flex-1">
              <Card className="flex flex-col lg:absolute lg:inset-0">
                <CardHeader>
                  <CardTitle>Materias</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col lg:min-h-0 lg:flex-1">
                  <MateriaSelector selected={materias} onChange={setMaterias} />
                </CardContent>
              </Card>
            </div>
          </div>

          <Card className="lg:row-span-2">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setFiltrosOpen((v) => !v)}
                  className="flex flex-1 items-center gap-2 text-left lg:cursor-default lg:pointer-events-none"
                >
                  <ChevronDown
                    className={
                      "size-5 shrink-0 text-muted-foreground transition-transform lg:hidden " +
                      (filtrosOpen ? "rotate-180" : "")
                    }
                  />
                  <CardTitle>Filtros</CardTitle>
                </button>
                {(diasPermitidos.length !== ALL_DIAS.length ||
                  franjas.length > 0 ||
                  sedesPermitidas.length > 0) && (
                  <button
                    type="button"
                    onClick={() => {
                      setDiasPermitidos(ALL_DIAS);
                      setFranjas([]);
                      setSedesPermitidas([]);
                    }}
                    className="text-sm font-medium leading-none text-primary hover:underline"
                  >
                    Restablecer
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent className={filtrosOpen ? "" : "hidden lg:block"}>
              <RestriccionesPanel
                diasPermitidos={diasPermitidos}
                onDiasPermitidosChange={setDiasPermitidos}
                franjas={franjas}
                onFranjasChange={setFranjas}
                sedesPermitidas={sedesPermitidas}
                onSedesChange={setSedesPermitidas}
                isPaid={isPaid}
                isLoading={subLoading}
                onUpgrade={() => openPaywall("filtros")}
              />
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <div className="hidden size-10 shrink-0 lg:block" aria-hidden />
            <div className="flex flex-1 flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <p className="text-sm text-muted-foreground">
                {materias.length === 0
                  ? "Seleccioná al menos una materia para generar planes."
                  : `Listo para generar planes con ${materias.length} ${materias.length === 1 ? "materia" : "materias"}.`}
              </p>
              <Button
                size="lg"
                onClick={generar}
                disabled={loading || materias.length === 0 || diasPermitidos.length === 0 || sinCambios}
                className="bg-gradient-to-r from-primary to-[#C72A88] text-primary-foreground hover:opacity-90"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                {loading ? "Generando..." : "Generar planes"}
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
            <AlertCircle className="mt-0.5 size-4 text-destructive" />
            <div className="text-sm">
              <p className="font-medium text-destructive">No se pudo generar</p>
              <p className="text-muted-foreground">{error}</p>
            </div>
          </div>
        )}

        {sinResultados && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm">
            <p className="font-medium text-amber-900">
              No se encontraron planes válidos
            </p>
            {resultado!.materias_sin_opciones.length > 0 ? (
              <p className="mt-1 text-amber-800">
                Las restricciones no dejan ninguna opción para:{" "}
                <span className="font-medium">
                  {materiasNombres(resultado!.materias_sin_opciones)}
                </span>
                . Probá relajar días, franjas, cátedra o profesores.
              </p>
            ) : (
              <p className="mt-1 text-amber-800">
                Todas las combinaciones se solapan entre sí. Probá quitar alguna
                materia o relajar restricciones.
              </p>
            )}
          </div>
        )}

        {resultado && resultado.planes.length > 0 && (
          <Card>
            <CardHeader className="flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Calendario</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  {resultado.total_generados} combinaciones evaluadas ·{" "}
                  {resultado.planes.length} plan
                  {resultado.planes.length === 1 ? "" : "es"} sin solapamientos
                </p>
              </div>
              <div className="flex items-center gap-2">
                {planActual && lastGeneratedFilters && (
                  <SaveFavoriteButton
                    plan={planActual}
                    filters={lastGeneratedFilters}
                    isPaid={isPaid}
                    onLockedClick={() => openPaywall("favoritos")}
                  />
                )}
                <PlanNavigator
                  index={planIdx}
                  total={resultado.planes.length}
                  onChange={setPlanIdx}
                />
              </div>
            </CardHeader>
            <CardContent>
              <CalendarioPlan plan={planActual} />
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
