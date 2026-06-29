import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/useAuth";
import {
  GraduationCap,
  Gem,
  Heart,
  Home as HomeIcon,
  LogIn,
  LogOut,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ContactLinks } from "@/components/Footer";
import { useSubscription } from "@/lib/useSubscription";
import { usePaywall } from "@/lib/paywall";
import { useCareer } from "@/lib/career";
import { hasPlanImage } from "@/lib/planEstudio";

const MESES_CORTOS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
] as const;

function useTabs() {
  const { isAuthenticated } = useAuth();
  const { carrera } = useCareer();
  // Misma condición exacta que PlanesEstudio para mostrar la vista única.
  // Si no coincide, el label de la tab promete algo que la página no entrega.
  const planLabel =
    isAuthenticated && hasPlanImage(carrera)
      ? "Plan de estudio"
      : "Planes de estudio";
  return [
    { to: "/", label: "Inicio", icon: HomeIcon },
    { to: "/favoritos", label: "Mis Planes", icon: Heart },
    { to: "/planes-estudio", label: planLabel, icon: GraduationCap },
  ];
}

function resolveTabTo(to: string): string {
  if (to !== "/") return to;
  if (typeof window === "undefined") return to;
  const saved = sessionStorage.getItem("horarios:last-home-search");
  return saved ? `/${saved}` : "/";
}

function Tabs() {
  const { pathname } = useLocation();
  const TABS = useTabs();
  return (
    <nav className="hidden items-center gap-4 sm:flex">
      {TABS.map(({ to, label, icon: Icon }) => {
        const active = pathname === to;
        return (
          <Link
            key={to}
            to={resolveTabTo(to)}
            className={
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors " +
              (active
                ? "font-semibold text-primary"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            <Icon
              className={"size-4 " + (active ? "text-primary" : "")}
              strokeWidth={active ? 2.5 : 2}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function MobileMenu() {
  const { pathname } = useLocation();
  const TABS = useTabs();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Abrir menú"
          className="flex size-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent sm:hidden"
        >
          <Menu className="size-6" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="p-0"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center border-b border-border px-4 py-4">
          <SheetTitle className="sr-only">Menú</SheetTitle>
          <img src="/logo.png" alt="Horarios" className="h-9 w-auto" />
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {TABS.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return (
              <SheetClose asChild key={to}>
                <Link
                  to={resolveTabTo(to)}
                  className={
                    "flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium transition-colors " +
                    (active
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-accent")
                  }
                >
                  <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
                  {label}
                </Link>
              </SheetClose>
            );
          })}
        </nav>

        <div className="border-t border-border p-4">
          <ContactLinks orientation="col" />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function PayChip() {
  const { isPaid, isLoading } = useSubscription();
  const openPaywall = usePaywall();

  if (isLoading) {
    return <Skeleton className="h-9 w-28 rounded-md" />;
  }
  if (isPaid) return null;

  return (
    <Button
      size="sm"
      onClick={() => openPaywall()}
      className="bg-[#EC990B] text-white hover:bg-[#EC990B]/90"
    >
      <Gem className="size-4" />
      <span className="hidden sm:inline">Hacete Pro</span>
    </Button>
  );
}

function UserMenu() {
  const { user, isAuthenticated, isLoading, openLogin, logout } = useAuth();
  const { isPaid, validUntil } = useSubscription();
  const { carreraNombre } = useCareer();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
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
      <div className="flex items-center gap-3">
        <PayChip />
        <Button variant="outline" size="sm" onClick={() => openLogin("signin")}>
          <LogIn className="size-4" />
          <span className="hidden sm:inline">Iniciar sesión</span>
        </Button>
      </div>
    );
  }

  const validUntilFormatted = validUntil
    ? `${validUntil.getDate()} ${MESES_CORTOS[validUntil.getMonth()]} ${validUntil.getFullYear()}`
    : undefined;

  return (
    <div className="flex items-center gap-3">
      <PayChip />
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="relative flex cursor-pointer items-center rounded-full transition-colors hover:bg-accent sm:gap-2 sm:rounded-2xl sm:border sm:border-border sm:bg-white sm:py-1 sm:pl-3 sm:pr-1"
          >
            <div className="hidden flex-col leading-tight sm:flex text-left">
              <div className="flex max-w-[12rem] flex-col">
                <span className="truncate text-xs text-foreground">{email}</span>
                {carreraNombre && (
                  <span className="truncate text-[10px] text-muted-foreground">
                    {carreraNombre}
                  </span>
                )}
              </div>
            </div>
            <span className="flex size-8 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
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
          <div className="border-b px-2 py-1.5">
            <div className="truncate text-xs text-muted-foreground">{email}</div>
            {isPaid && validUntilFormatted && (
              <div className="mt-0.5 text-[10px] font-medium text-[#EC990B]">
                Pro hasta {validUntilFormatted}
              </div>
            )}
          </div>
          <CambiarCarreraButton onClicked={() => setMenuOpen(false)} />
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setConfirmingLogout(true);
            }}
            className="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
          >
            <LogOut className="size-4" /> Cerrar sesión
          </button>
        </PopoverContent>
      </Popover>

      <Dialog open={confirmingLogout} onOpenChange={setConfirmingLogout}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Cerrar sesión?</DialogTitle>
            <DialogDescription>
              Vas a tener que volver a iniciar sesión para acceder a tus planes
              guardados.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setConfirmingLogout(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmingLogout(false);
                logout();
              }}
            >
              <LogOut className="size-4" />
              Cerrar sesión
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CambiarCarreraButton({ onClicked }: { onClicked: () => void }) {
  // Sólo tiene sentido cuando ya hay una carrera guardada en perfil. Mientras
  // se carga el profile (o no hay todavía), no mostramos la opción para no
  // chocar con el modal forced.
  const { carrera, openChangeCarrera } = useCareer();
  if (!carrera) return null;
  return (
    <button
      type="button"
      onClick={() => {
        onClicked();
        openChangeCarrera();
      }}
      className="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
    >
      <GraduationCap className="size-4" /> Cambiar carrera
    </button>
  );
}

export function Header() {
  return (
    <header className="border-b border-border bg-card">
      <div className="container flex items-center gap-2 py-4 sm:gap-4">
        <MobileMenu />
        <Link to="/" className="flex flex-1 items-center">
          <img src="/logo.png" alt="Horarios" className="h-9 w-auto sm:h-12" />
        </Link>
        <Tabs />
        <div className="flex flex-1 justify-end">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
