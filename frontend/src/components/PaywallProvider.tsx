import { useState, type ReactNode } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import {
  Filter,
  GraduationCap,
  CalendarDays,
  Heart,
  Loader2,
  LogIn,
  Gem,
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

export const FREE_MAX_PLANES = 10;
export const PRO_MAX_PLANES = 50;

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
              disabled={loading}
            >
              {loading ? (
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
          </>
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
