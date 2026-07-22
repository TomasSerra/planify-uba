import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Loader2, X, ZoomIn } from "lucide-react";
import { Header } from "@/components/Header";
import { Seo } from "@/components/Seo";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import { useCareer } from "@/lib/career";
import { PLAN_IMAGES, hasPlanImage } from "@/lib/planEstudio";

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

function PlanImagen({ src, alt }: { src: string; alt: string }) {
  const [zoomed, setZoomed] = useState(false);
  return (
    <div className="relative mx-auto w-full max-w-4xl">
      <img
        src={src}
        alt={alt}
        loading="lazy"
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
      {zoomed && (
        <FullscreenImage
          src={src}
          alt={alt}
          onClose={() => setZoomed(false)}
        />
      )}
    </div>
  );
}

function CarreraAccordion({
  nombre,
  imagen,
}: {
  nombre: string;
  imagen: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left sm:px-6"
      >
        <span className="text-base font-semibold sm:text-lg">{nombre}</span>
        <ChevronDown
          className={cn(
            "size-5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div className="border-t border-border bg-muted/30 p-4 sm:p-6">
          <PlanImagen
            src={imagen}
            alt={`Plan de estudios de ${nombre} — Facultad de Psicología UBA`}
          />
        </div>
      )}
    </Card>
  );
}

function EmptyMessage({ children }: { children: React.ReactNode }) {
  return (
    <Card className="px-6 py-10 text-center text-sm text-muted-foreground">
      {children}
    </Card>
  );
}

export function PlanesEstudio() {
  const { isAuthenticated } = useAuth();
  const { carrera, carreraNombre, isLoading: careerLoading } = useCareer();
  // /carreras viene con Cache-Control max-age=3600 desde el BE; el staleTime
  // largo evita refetch al cambiar de tab.
  const { data: carreras, isLoading: carrerasLoading } = useQuery({
    queryKey: ["carreras"],
    queryFn: () => api.listCarreras(),
    staleTime: 60 * 60 * 1000,
  });

  // Vista única solo para usuarios autenticados (con carrera real elegida
  // en su perfil). Los anónimos tienen un `carrera` default en localStorage
  // que NO refleja una elección consciente — para ellos mostramos todas en
  // accordion.
  const isLoading = careerLoading || carrerasLoading;
  const showSinglePlan = isAuthenticated && hasPlanImage(carrera);
  const authSinPlan =
    !isLoading && isAuthenticated && carrera !== null && !hasPlanImage(carrera);
  const disponibles = (carreras ?? []).filter((c) => hasPlanImage(c.slug));

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Planes de estudio por carrera — Psicología UBA | Planify"
        description="Mapa de materias y correlatividades de las carreras de la Facultad de Psicología (UBA): Licenciatura en Psicología, Profesorado, Musicoterapia y Terapia Ocupacional."
        path="/planes-estudio"
      />
      <Header />
      <main className="container max-w-6xl space-y-6 px-4 pb-8 pt-8 sm:px-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {showSinglePlan ? "Plan de estudio" : "Planes de estudio"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {showSinglePlan
              ? carreraNombre ?? "Mapa de materias"
              : "Mapa de materias por carrera"}
          </p>
        </div>

        {isLoading ? (
          <Card className="flex items-center justify-center px-6 py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </Card>
        ) : showSinglePlan && carrera ? (
          <Card className="p-4 sm:p-6">
            <PlanImagen
              src={PLAN_IMAGES[carrera]}
              alt={`Plan de estudios de ${
                carreraNombre ?? carrera
              } — Facultad de Psicología UBA`}
            />
          </Card>
        ) : authSinPlan ? (
          // El usuario tiene una carrera elegida pero no tenemos el plan
          // todavía. Mostramos un mensaje explícito en lugar de los planes
          // de otras carreras (que sería más confuso).
          <EmptyMessage>
            El plan de estudio de{" "}
            <span className="font-medium">{carreraNombre ?? "tu carrera"}</span>{" "}
            todavía no está disponible. Estamos trabajando para sumarlo.
          </EmptyMessage>
        ) : disponibles.length === 0 ? (
          <EmptyMessage>
            No hay planes de estudio disponibles por ahora.
          </EmptyMessage>
        ) : (
          <div className="space-y-3">
            {disponibles.map((c) => (
              <CarreraAccordion
                key={c.slug}
                nombre={c.nombre}
                imagen={PLAN_IMAGES[c.slug]}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
