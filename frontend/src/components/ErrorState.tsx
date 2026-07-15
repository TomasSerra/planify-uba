import { AlertCircle, Loader2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  title?: string;
  description?: string;
  onRetry: () => void;
  retrying?: boolean;
  className?: string;
}

// Estado de error genérico: título + descripción no técnica + reintentar.
// Nunca recibe ni muestra el mensaje crudo del error.
export function ErrorState({
  title = "Algo salió mal",
  description = "No pudimos completar la acción. Revisá tu conexión e intentá de nuevo.",
  onRetry,
  retrying = false,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 py-8 text-center",
        className
      )}
    >
      <AlertCircle className="size-8 text-destructive" strokeWidth={1.5} />
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry} disabled={retrying}>
        {retrying ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <RotateCw className="size-4" />
        )}
        Reintentar
      </Button>
    </div>
  );
}
