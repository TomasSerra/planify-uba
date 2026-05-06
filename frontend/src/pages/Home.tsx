import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Sparkles,
  Loader2,
  AlertCircle,
  CreditCard,
  Check,
  CheckCircle2,
  Gem,
  LogIn,
  LogOut,
  XCircle,
} from "lucide-react";
import { useAuth0 } from "@auth0/auth0-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { MateriaSelector } from "@/components/MateriaSelector";
import { RestriccionesPanel } from "@/components/RestriccionesPanel";
import { CalendarioPlan } from "@/components/CalendarioPlan";
import { PlanNavigator } from "@/components/PlanNavigator";
import { api } from "@/lib/api";
import { useSubscription } from "@/lib/useSubscription";
import { PaywallContext, usePaywall } from "@/lib/paywall";
import { useAlert } from "@/lib/alert";
import {
  DIAS,
  type FranjaExcluida,
  type MateriaSeleccionada,
  type PlanResponse,
} from "@/lib/types";

interface SeleccionConNombre extends MateriaSeleccionada {
  nombre: string;
}

// Mantener en sync con backend: SUBSCRIPTION_PRICE_ARS y SUBSCRIPTION_DAYS.
const SUBSCRIPTION_PRICE_ARS = 5000;
const SUBSCRIPTION_MONTHS = 3;

const PRO_BENEFITS = [
  "Filtrá por días, franjas horarias y sedes",
  "Elegí cátedra fija o profesores específicos",
  "Generá hasta 100 planes (gratis: 10)",
  "Guardá tus combinaciones favoritas",
];

function PaywallDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { getAccessTokenSilently, isAuthenticated, loginWithRedirect } =
    useAuth0();
  const showAlert = useAlert();
  const [loading, setLoading] = useState(false);

  async function pagar() {
    setLoading(true);
    try {
      const token = await getAccessTokenSilently();
      if (!token) throw new Error("No token");
      const { init_point } = await api.postCheckout(token);
      window.location.href = init_point;
    } catch (e) {
      setLoading(false);
      showAlert({
        variant: "error",
        title: "No se pudo iniciar el pago",
        message: (e as Error).message,
      });
    }
  }

  const formattedPrice = new Intl.NumberFormat("es-AR").format(
    SUBSCRIPTION_PRICE_ARS
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suscripción Pro</DialogTitle>
          <DialogDescription>
            Desbloqueá todas las funciones para armar tu cursada sin límites.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-3 py-2">
          {PRO_BENEFITS.map((b) => (
            <li key={b} className="flex items-start gap-3">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#EC990B]/15 text-[#EC990B]">
                <Check className="size-3.5" strokeWidth={3} />
              </span>
              <span className="text-sm">{b}</span>
            </li>
          ))}
        </ul>

        {isAuthenticated ? (
          <Button
            size="lg"
            className="w-full bg-[#EC990B] text-white hover:bg-[#EC990B]/90"
            onClick={pagar}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CreditCard className="size-4" />
            )}
            Pagar ${formattedPrice} · {SUBSCRIPTION_MONTHS} meses
          </Button>
        ) : (
          <Button
            size="lg"
            className="w-full bg-[#EC990B] text-white hover:bg-[#EC990B]/90"
            onClick={() => loginWithRedirect()}
          >
            <LogIn className="size-4" />
            Iniciar sesión
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PayChip() {
  const { isPaid, isLoading } = useSubscription();
  const openPaywall = usePaywall();

  if (isLoading) {
    return <Skeleton className="h-9 w-28 rounded-md" />;
  }

  // Cuando está pago, el indicador "Pro hasta..." va dentro del UserMenu
  // (junto al email + badge Gem). Acá no renderizamos nada.
  if (isPaid) return null;

  return (
    <Button
      size="sm"
      onClick={openPaywall}
      className="bg-[#EC990B] text-white hover:bg-[#EC990B]/90"
    >
      <Gem className="size-4" />
      Hacete Pro
    </Button>
  );
}

function UserMenu() {
  const { user, isAuthenticated, isLoading, loginWithRedirect, logout } =
    useAuth0();
  const { isPaid, validUntil } = useSubscription();
  const email = user?.email ?? "";
  const initial = email.slice(0, 1).toUpperCase() || "?";

  if (isLoading) {
    return (
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-28 rounded-md" />
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Button size="sm" onClick={() => loginWithRedirect()}>
        <LogIn className="size-4" />
        Iniciar sesión
      </Button>
    );
  }

  const validUntilFormatted = validUntil?.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="flex items-center gap-3">
      <PayChip />
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="relative flex cursor-pointer items-center gap-2 rounded-2xl border border-border bg-background py-1 pl-3 pr-1 transition-colors hover:bg-accent"
          >
            <div className="hidden flex-col leading-tight sm:flex text-left">
              <span className="text-xs text-foreground">{email}</span>
              {isPaid && validUntilFormatted && (
                <span className="text-[10px] font-medium text-[#EC990B]">
                  Pro hasta {validUntilFormatted}
                </span>
              )}
            </div>
            <span className="flex size-8 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {user?.picture ? (
                <img
                  src={user.picture}
                  alt={email}
                  className="size-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                initial
              )}
            </span>
            {isPaid && (
              <span
                className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-[#EC990B] text-white shadow-sm ring-2 ring-card"
                title="Suscripción Pro activa"
              >
                <Gem className="size-3" strokeWidth={2.5} />
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-56 p-2">
          <div className="border-b px-2 py-1.5 text-xs text-muted-foreground">
            {email}
          </div>
          <button
            type="button"
            onClick={() =>
              logout({
                logoutParams: { returnTo: window.location.origin },
              })
            }
            className="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
          >
            <LogOut className="size-4" /> Cerrar sesión
          </button>
        </PopoverContent>
      </Popover>
    </div>
  );
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
              <CreditCard className="size-4" />
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

const ALL_DIAS: string[] = [...DIAS];

export function Home() {
  const { isPaid, isLoading: subLoading } = useSubscription();
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();
  const showAlert = useAlert();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const openPaywall = () => setPaywallOpen(true);

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

  const [resultado, setResultado] = useState<PlanResponse | null>(null);
  const [planIdx, setPlanIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastGeneratedSignature, setLastGeneratedSignature] = useState<
    string | null
  >(null);

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

  async function generar() {
    if (materias.length === 0) return;
    setLoading(true);
    setError(null);
    setResultado(null);
    setPlanIdx(0);
    try {
      const dias_excluidos = ALL_DIAS.filter((d) => !diasPermitidos.includes(d));
      const token = isAuthenticated
        ? await getAccessTokenSilently().catch(() => null)
        : null;
      const data = await api.postPlanes(
        {
          materias: materias.map(({ codigo, catedra_id, profesores }) => ({
            codigo,
            catedra_id,
            profesores,
          })),
          dias_excluidos,
          franjas_excluidas: franjas,
          sedes_permitidas: sedesPermitidas,
          max_planes: 30,
        },
        token
      );
      setResultado(data);
      setLastGeneratedSignature(currentSignature);
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

  const planActual = resultado?.planes[planIdx] ?? null;
  const sinResultados = resultado && resultado.planes.length === 0;
  const materiasNombres = (codigos: number[]) =>
    codigos
      .map((c) => materias.find((m) => m.codigo === c)?.nombre ?? `#${c}`)
      .join(", ");

  return (
    <PaywallContext.Provider value={openPaywall}>
    <div className="min-h-screen bg-background">
      <PaywallDialog open={paywallOpen} onOpenChange={setPaywallOpen} />
      <PagoErrorDialog state={pagoError} onClose={() => setPagoError(null)} />
      <PagoStatusDialog
        externalReference={pagoExternalRef}
        onClose={() => setPagoExternalRef(null)}
      />
      <header className="border-b border-border bg-card">
        <div className="container flex items-center justify-between py-5">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Horarios</h1>
            <p className="text-xs text-muted-foreground">
              Facultad de Psicología — UBA
            </p>
          </div>
          <UserMenu />
        </div>
      </header>

      <main className="container max-w-6xl space-y-6 py-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Materias</CardTitle>
            </CardHeader>
            <CardContent>
              <MateriaSelector selected={materias} onChange={setMaterias} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <RestriccionesPanel
                diasPermitidos={diasPermitidos}
                onDiasPermitidosChange={setDiasPermitidos}
                franjas={franjas}
                onFranjasChange={setFranjas}
                sedesPermitidas={sedesPermitidas}
                onSedesChange={setSedesPermitidas}
                isPaid={isPaid}
                isLoading={subLoading}
                onUpgrade={openPaywall}
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-between gap-4">
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
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Calendario</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  {resultado.total_generados} combinaciones evaluadas ·{" "}
                  {resultado.planes.length} plan
                  {resultado.planes.length === 1 ? "" : "es"} sin solapamientos
                </p>
              </div>
              <PlanNavigator
                index={planIdx}
                total={resultado.planes.length}
                onChange={setPlanIdx}
              />
            </CardHeader>
            <CardContent>
              <CalendarioPlan plan={planActual} />
            </CardContent>
          </Card>
        )}
      </main>
    </div>
    </PaywallContext.Provider>
  );
}
