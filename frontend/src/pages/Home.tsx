import { useMemo, useRef, useState } from "react";
import {
  Sparkles,
  Loader2,
  AlertCircle,
  CreditCard,
  Check,
  Gem,
  LogIn,
} from "lucide-react";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useAuth,
  useUser,
} from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
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
  const { getToken } = useAuth();
  const { isSignedIn } = useUser();
  const showAlert = useAlert();
  const [loading, setLoading] = useState(false);

  async function pagar() {
    setLoading(true);
    try {
      const token = await getToken();
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

        {isSignedIn ? (
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
          <SignInButton mode="modal">
            <Button
              size="lg"
              className="w-full bg-[#EC990B] text-white hover:bg-[#EC990B]/90"
            >
              <LogIn className="size-4" />
              Iniciar sesión
            </Button>
          </SignInButton>
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
  const { user, isLoaded } = useUser();
  const { isPaid, validUntil } = useSubscription();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const containerRef = useRef<HTMLDivElement>(null);

  if (!isLoaded) {
    return (
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-28 rounded-md" />
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>
    );
  }

  const validUntilFormatted = validUntil?.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="flex items-center gap-3">
      <SignedOut>
        <SignInButton mode="modal">
          <Button size="sm">
            <LogIn className="size-4" />
            Iniciar sesión
          </Button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <PayChip />
        <div
          ref={containerRef}
          onClick={(e) => {
            const trigger = containerRef.current?.querySelector(
              ".cl-userButtonTrigger"
            ) as HTMLElement | null;
            if (trigger && !trigger.contains(e.target as Node)) {
              trigger.click();
            }
          }}
          className="relative flex cursor-pointer items-center gap-2 rounded-2xl border border-border bg-background py-1 pl-3 pr-1 transition-colors hover:bg-accent"
        >
          <div className="hidden flex-col leading-tight sm:flex">
            <span className="text-xs text-foreground">{email}</span>
            {isPaid && validUntilFormatted && (
              <span className="text-[10px] font-medium text-[#EC990B]">
                Pro hasta {validUntilFormatted}
              </span>
            )}
          </div>
          <UserButton
            afterSignOutUrl="/"
            appearance={{ elements: { avatarBox: "h-8 w-8" } }}
          />
          {isPaid && (
            <span
              className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-[#EC990B] text-white shadow-sm ring-2 ring-card"
              title="Suscripción Pro activa"
            >
              <Gem className="size-3" strokeWidth={2.5} />
            </span>
          )}
        </div>
      </SignedIn>
    </div>
  );
}

const ALL_DIAS: string[] = [...DIAS];

export function Home() {
  const { isPaid, isLoading: subLoading } = useSubscription();
  const { getToken } = useAuth();
  const showAlert = useAlert();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const openPaywall = () => setPaywallOpen(true);

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
      const token = await getToken().catch(() => null);
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
