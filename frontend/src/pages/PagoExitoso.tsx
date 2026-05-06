import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

const POLL_INTERVAL_MS = 2000;
const MAX_WAIT_MS = 30_000;

export function PagoExitoso() {
  const [params] = useSearchParams();
  const ref = params.get("ref");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const startedAt = useState(Date.now)[0];

  const { data, error } = useQuery({
    queryKey: ["pago-status", ref],
    queryFn: () => {
      if (!ref) throw new Error("Falta external_reference");
      return api.getPagoStatus(ref);
    },
    enabled: !!ref,
    refetchInterval: (q) => {
      if (q.state.data?.status === "approved") return false;
      if (Date.now() - startedAt > MAX_WAIT_MS) return false;
      return POLL_INTERVAL_MS;
    },
  });

  useEffect(() => {
    if (data?.status === "approved") {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      const t = setTimeout(() => navigate("/", { replace: true }), 1500);
      return () => clearTimeout(t);
    }
  }, [data?.status, navigate, queryClient]);

  if (!ref) {
    return (
      <Centered>
        <AlertCircle className="size-10 text-destructive" />
        <p className="mt-4 text-sm text-muted-foreground">
          Falta el parámetro <code>ref</code> en la URL.
        </p>
        <Button className="mt-4" onClick={() => navigate("/")}>
          Volver al inicio
        </Button>
      </Centered>
    );
  }

  if (error) {
    return (
      <Centered>
        <AlertCircle className="size-10 text-destructive" />
        <p className="mt-4 text-sm text-muted-foreground">
          {(error as Error).message}
        </p>
        <Button className="mt-4" onClick={() => navigate("/")}>
          Volver al inicio
        </Button>
      </Centered>
    );
  }

  if (data?.status === "approved") {
    return (
      <Centered>
        <CheckCircle2 className="size-10 text-emerald-600" />
        <p className="mt-4 text-base font-medium">¡Listo! Pago acreditado.</p>
        <p className="mt-1 text-sm text-muted-foreground">Te llevamos al inicio…</p>
      </Centered>
    );
  }

  const timedOut = Date.now() - startedAt > MAX_WAIT_MS;
  if (timedOut) {
    return (
      <Centered>
        <AlertCircle className="size-10 text-amber-600" />
        <p className="mt-4 text-base font-medium">El pago se está acreditando.</p>
        <p className="mt-1 max-w-md text-center text-sm text-muted-foreground">
          Mercado Pago a veces tarda unos minutos. Cuando se acredite, vas a ver
          el chip "Pro" en el header.
        </p>
        <Button className="mt-4" onClick={() => navigate("/")}>
          Volver al inicio
        </Button>
      </Centered>
    );
  }

  return (
    <Centered>
      <Loader2 className="size-10 animate-spin text-primary" />
      <p className="mt-4 text-base font-medium">Confirmando tu pago…</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Esto puede tardar unos segundos.
      </p>
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      {children}
    </div>
  );
}

