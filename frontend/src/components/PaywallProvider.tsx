import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/useAuth";
import { QRCodeSVG } from "qrcode.react";
import {
  Filter,
  GraduationCap,
  CalendarDays,
  Heart,
  Loader2,
  LogIn,
  Gem,
  QrCode,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import mpIcon from "@/assets/mp-icon.png";
import { api } from "@/lib/api";
import { useAlert } from "@/lib/alert";
import { PaywallContext, type PaywallReason } from "@/lib/paywall";

// Mantener en sync con backend: SUBSCRIPTION_PRICE_ARS y SUBSCRIPTION_DAYS.
const SUBSCRIPTION_PRICE_ARS = 3000;
const SUBSCRIPTION_MONTHS = 3;

export const FREE_MAX_PLANES = 30;
export const PRO_MAX_PLANES = 100;

const PRO_BENEFITS: { icon: LucideIcon; text: string }[] = [
  { icon: Filter, text: "Filtrá por días, franjas horarias y sedes" },
  { icon: GraduationCap, text: "Elegí cátedra fija o profesores específicos" },
  {
    icon: CalendarDays,
    text: `Generá hasta ${PRO_MAX_PLANES} planes (gratis: ${FREE_MAX_PLANES})`,
  },
  { icon: Heart, text: "Guardá tus combinaciones favoritas" },
];

const PAYWALL_COPY: Record<PaywallReason, { title: string; description: string }> = {
  catedra: {
    title: "Elegí tu cátedra con Pro",
    description:
      "Seleccionar una cátedra específica es una función Pro. Suscribite y desbloqueá ésta y todas las funciones avanzadas.",
  },
  profesores: {
    title: "Filtrá por profesores con Pro",
    description:
      "Elegir profesores específicos es una función Pro. Suscribite y desbloqueá ésta y todas las funciones avanzadas.",
  },
  filtros: {
    title: "Filtros avanzados con Pro",
    description:
      "Filtrar por días, franjas horarias y sedes es una función Pro. Suscribite y desbloqueá éstas y todas las funciones avanzadas.",
  },
  favoritos: {
    title: "Guardá tus planes con Pro",
    description:
      "Guardar combinaciones en favoritos es una función Pro. Suscribite y desbloqueá ésta y todas las funciones avanzadas.",
  },
  general: {
    title: "Hacete Pro",
    description:
      "Desbloqueá todas las funciones para armar tu cursada sin límites.",
  },
};

function PaywallDialog({
  open,
  reason,
  onOpenChange,
}: {
  open: boolean;
  reason: PaywallReason | null;
  onOpenChange: (v: boolean) => void;
}) {
  const { getAccessTokenSilently, isAuthenticated, openLogin } = useAuth();
  const showAlert = useAlert();
  const [initPoint, setInitPoint] = useState<string | null>(null);
  const [loadingFor, setLoadingFor] = useState<"redirect" | "qr" | null>(null);
  const [showQR, setShowQR] = useState(false);
  const redirectStartedAtRef = useRef<number | null>(null);
  const safetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) {
      setInitPoint(null);
      setShowQR(false);
      setLoadingFor(null);
      redirectStartedAtRef.current = null;
      if (safetyTimeoutRef.current !== null) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }
    }
  }, [open]);

  // Si el usuario va a MP (o abre el QR en otra tab) y vuelve sin pagar,
  // el botón puede quedar en loading. visibilitychange + timeout de seguridad
  // resetean el estado cuando la tab vuelve a estar visible.
  useEffect(() => {
    if (loadingFor === null) {
      redirectStartedAtRef.current = null;
      if (safetyTimeoutRef.current !== null) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }
      return;
    }
    redirectStartedAtRef.current = Date.now();
    safetyTimeoutRef.current = setTimeout(() => setLoadingFor(null), 10_000);
    function onVisibility() {
      if (document.visibilityState !== "visible") return;
      const started = redirectStartedAtRef.current;
      if (started === null) return;
      if (Date.now() - started < 800) return;
      setLoadingFor(null);
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (safetyTimeoutRef.current !== null) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }
    };
  }, [loadingFor]);

  async function fetchInitPoint(): Promise<string | null> {
    if (initPoint) return initPoint;
    let token: string;
    try {
      token = await getAccessTokenSilently();
    } catch {
      openLogin("signin");
      return null;
    }
    const { init_point } = await api.postCheckout(token);
    setInitPoint(init_point);
    return init_point;
  }

  async function pagar() {
    setLoadingFor("redirect");
    try {
      const ip = await fetchInitPoint();
      if (ip) window.location.href = ip;
    } catch (e) {
      showAlert({
        variant: "error",
        title: "No se pudo iniciar el pago",
        message: (e as Error).message,
      });
    } finally {
      setLoadingFor(null);
    }
  }

  async function togglePagoMobile() {
    if (showQR) {
      setShowQR(false);
      return;
    }
    setLoadingFor("qr");
    try {
      const ip = await fetchInitPoint();
      if (ip) setShowQR(true);
    } catch (e) {
      showAlert({
        variant: "error",
        title: "No se pudo iniciar el pago",
        message: (e as Error).message,
      });
    } finally {
      setLoadingFor(null);
    }
  }

  const formattedPrice = new Intl.NumberFormat("es-AR").format(
    SUBSCRIPTION_PRICE_ARS
  );

  const { title, description } = PAYWALL_COPY[reason ?? "general"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gem className="size-5 text-[#EC990B]" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <ul className="space-y-3 py-2">
          {PRO_BENEFITS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#EC990B]/15 text-[#EC990B]">
                <Icon className="size-4" strokeWidth={2.25} />
              </span>
              <span className="text-sm font-medium">{text}</span>
            </li>
          ))}
        </ul>

        {isAuthenticated ? (
          <>
            <Button
              size="lg"
              className="w-full bg-[#EC990B] text-white hover:bg-[#EC990B]/90"
              onClick={pagar}
              disabled={loadingFor !== null}
            >
              {loadingFor === "redirect" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <img src={mpIcon} alt="" className="h-4 w-auto" />
              )}
              Pagar ${formattedPrice} · {SUBSCRIPTION_MONTHS} meses
            </Button>
            <p className="px-2 text-center text-xs text-muted-foreground">
              Pago único por {SUBSCRIPTION_MONTHS} meses. No es una suscripción
              automática.
            </p>
            <div className="hidden md:block">
              <div className="my-2 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">O</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={togglePagoMobile}
                disabled={loadingFor !== null}
              >
                {loadingFor === "qr" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <QrCode className="size-4" />
                )}
                Pagar desde tu celular
              </Button>
              {showQR && initPoint && (
                <div className="flex flex-col items-center gap-2 pt-3">
                  <div className="rounded-lg border bg-white p-3">
                    <QRCodeSVG value={initPoint} size={160} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Escaneá con la cámara del celular
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <Button
            size="lg"
            className="w-full bg-[#EC990B] text-white hover:bg-[#EC990B]/90"
            onClick={() => openLogin("signin")}
          >
            <LogIn className="size-4" />
            Iniciar sesión
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function PaywallProvider({ children }: { children: ReactNode }) {
  const [reason, setReason] = useState<PaywallReason | null>(null);
  const open = (r: PaywallReason = "general") => setReason(r);

  return (
    <PaywallContext.Provider value={open}>
      {children}
      <PaywallDialog
        open={reason !== null}
        reason={reason}
        onOpenChange={(v) => !v && setReason(null)}
      />
    </PaywallContext.Provider>
  );
}
