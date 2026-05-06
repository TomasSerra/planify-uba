import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type AlertVariant = "error" | "warning" | "info";

interface AlertOptions {
  title: string;
  message: string;
  variant?: AlertVariant;
}

const AlertContext = createContext<((opts: AlertOptions) => void) | null>(null);

export function useAlert() {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error("useAlert fuera del AlertProvider");
  return ctx;
}

const VARIANT_STYLE: Record<AlertVariant, { Icon: typeof AlertCircle; cls: string }> = {
  error: { Icon: AlertCircle, cls: "text-destructive" },
  warning: { Icon: AlertTriangle, cls: "text-amber-600" },
  info: { Icon: Info, cls: "text-primary" },
};

export function AlertProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<AlertOptions>({
    title: "",
    message: "",
    variant: "error",
  });

  const showAlert = useCallback((next: AlertOptions) => {
    setOpts(next);
    setOpen(true);
  }, []);

  const { Icon, cls } = VARIANT_STYLE[opts.variant ?? "error"];

  return (
    <AlertContext.Provider value={showAlert}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon className={`size-5 shrink-0 ${cls}`} />
              {opts.title}
            </DialogTitle>
            <DialogDescription className="pt-1">
              {opts.message}
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => setOpen(false)} className="w-full">
            Entendido
          </Button>
        </DialogContent>
      </Dialog>
    </AlertContext.Provider>
  );
}
