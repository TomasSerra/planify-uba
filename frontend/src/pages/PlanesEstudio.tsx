import { useEffect, useState } from "react";
import { ChevronDown, X, ZoomIn } from "lucide-react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Carrera = {
  id: string;
  nombre: string;
  imagen: string;
};

const CARRERAS: Carrera[] = [
  {
    id: "licenciatura-psicologia",
    nombre: "Licenciatura en Psicología",
    imagen: "/plan-licenciatura-psicologia.png",
  },
];

function FullscreenImage({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        className="absolute right-4 top-4 z-10 flex size-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20"
        style={{ marginTop: "env(safe-area-inset-top)" }}
      >
        <X className="size-5" />
      </button>
      <div
        className="size-full overflow-auto p-4"
        onClick={onClose}
      >
        <img
          src={src}
          alt={alt}
          onClick={(e) => e.stopPropagation()}
          className="mx-auto h-auto min-h-full w-auto min-w-full max-w-none object-contain"
        />
      </div>
    </div>
  );
}

function CarreraAccordion({ carrera }: { carrera: Carrera }) {
  const [open, setOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left sm:px-6"
      >
        <span className="text-base font-semibold sm:text-lg">
          {carrera.nombre}
        </span>
        <ChevronDown
          className={cn(
            "size-5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div className="border-t border-border bg-muted/30 p-4 sm:p-6">
          <div className="relative mx-auto w-full max-w-4xl">
            <img
              src={carrera.imagen}
              alt={`Plan de estudios ${carrera.nombre}`}
              className="w-full rounded-md bg-white"
            />
            <button
              type="button"
              onClick={() => setZoomed(true)}
              aria-label="Ampliar imagen"
              className="absolute left-1/2 top-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-2 ring-white/80 transition-transform active:scale-95 sm:hidden"
            >
              <ZoomIn className="size-5" />
            </button>
          </div>
        </div>
      )}
      {zoomed && (
        <FullscreenImage
          src={carrera.imagen}
          alt={`Plan de estudios ${carrera.nombre}`}
          onClose={() => setZoomed(false)}
        />
      )}
    </Card>
  );
}

export function PlanesEstudio() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-6xl space-y-6 px-4 pb-24 pt-8 sm:px-6 sm:pb-8">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Planes de estudio
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Mapa de materias por carrera
          </p>
        </div>

        <div className="space-y-3">
          {CARRERAS.map((c) => (
            <CarreraAccordion key={c.id} carrera={c} />
          ))}
        </div>
      </main>
    </div>
  );
}
