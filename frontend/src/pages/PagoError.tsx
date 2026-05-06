import { useNavigate, useSearchParams } from "react-router-dom";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PagoError() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const status = params.get("status");
  const statusDetail = params.get("status_detail");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <XCircle className="size-10 text-destructive" />
      <p className="mt-4 text-base font-medium">El pago no se procesó</p>
      <p className="mt-1 max-w-md text-center text-sm text-muted-foreground">
        Mercado Pago rechazó la transacción
        {status && status !== "null" ? ` (${status})` : ""}
        {statusDetail && statusDetail !== "null" ? `: ${statusDetail}` : ""}.
        No se descontó plata. Probá de nuevo o usá otro medio de pago.
      </p>
      <div className="mt-6 flex gap-2">
        <Button variant="outline" onClick={() => navigate("/")}>
          Volver al inicio
        </Button>
        <Button onClick={() => navigate("/?reintentar=1")}>Reintentar</Button>
      </div>
    </div>
  );
}
