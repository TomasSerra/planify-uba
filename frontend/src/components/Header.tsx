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
import { Skeleton } from "@/components/ui/skeleton";
import { useSubscription } from "@/lib/useSubscription";
import { usePaywall } from "@/lib/paywall";

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

const TABS = [
  { to: "/", label: "Inicio", icon: HomeIcon },
  { to: "/favoritos", label: "Mis Planes", icon: Heart },
  { to: "/planes-estudio", label: "Planes de estudio", icon: GraduationCap },
];

function resolveTabTo(to: string): string {
  if (to !== "/") return to;
  if (typeof window === "undefined") return to;
  const saved = sessionStorage.getItem("horarios:last-home-search");
  return saved ? `/${saved}` : "/";
}

function Tabs() {
  const { pathname } = useLocation();
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

function MobileBottomNav() {
  const { pathname } = useLocation();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-stretch justify-around">
        {TABS.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={resolveTabTo(to)}
              aria-label={label}
              className={
                "flex flex-1 flex-col items-center gap-0.5 px-3 py-2 text-[11px] font-medium transition-colors " +
                (active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              <Icon
                className="size-5"
                strokeWidth={active ? 2.5 : 2}
              />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
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
      <Button size="sm" onClick={() => openLogin("signin")}>
        <LogIn className="size-4" />
        Iniciar sesión
      </Button>
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
              <span className="text-xs text-foreground">{email}</span>
              {isPaid && validUntilFormatted && (
                <span className="text-[10px] font-medium text-[#EC990B]">
                  Pro hasta {validUntilFormatted}
                </span>
              )}
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
          <div className="border-b px-2 py-1.5 text-xs text-muted-foreground">
            {email}
          </div>
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

export function Header() {
  return (
    <>
      <header className="border-b border-border bg-card">
        <div className="container flex items-center gap-2 py-4 sm:gap-4">
          <Link to="/" className="flex flex-1 items-center">
            <img src="/logo.png" alt="Horarios" className="h-9 w-auto sm:h-12" />
          </Link>
          <Tabs />
          <div className="flex flex-1 justify-end">
            <UserMenu />
          </div>
        </div>
      </header>
      <MobileBottomNav />
    </>
  );
}
