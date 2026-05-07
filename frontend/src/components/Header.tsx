import { Link, useLocation } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { Gem, Heart, Home as HomeIcon, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubscription } from "@/lib/useSubscription";
import { usePaywall } from "@/lib/paywall";

const TABS = [
  { to: "/", label: "Inicio", icon: HomeIcon },
  { to: "/favoritos", label: "Planes guardados", icon: Heart },
];

function Tabs() {
  const { pathname } = useLocation();
  return (
    <nav className="flex items-center gap-4">
      {TABS.map(({ to, label, icon: Icon }) => {
        const active = pathname === to;
        return (
          <Link
            key={to}
            to={to}
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
      Hacete Pro
    </Button>
  );
}

function UserMenu() {
  const { user, isAuthenticated, isLoading, loginWithRedirect, logout } =
    useAuth0();
  const { isPaid, validUntil } = useSubscription();
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
      <Button size="sm" onClick={() => loginWithRedirect()}>
        <LogIn className="size-4" />
        Iniciar sesión
      </Button>
    );
  }

  const validUntilFormatted = validUntil?.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="flex items-center gap-3">
      <PayChip />
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="relative flex cursor-pointer items-center gap-2 rounded-2xl border border-border bg-white py-1 pl-3 pr-1 transition-colors hover:bg-accent"
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
              {user?.picture ? (
                <img
                  src={user.picture}
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
            onClick={() =>
              logout({
                logoutParams: { returnTo: window.location.origin },
              })
            }
            className="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
          >
            <LogOut className="size-4" /> Cerrar sesión
          </button>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function Header() {
  return (
    <header className="border-b border-border bg-card">
      <div className="container flex items-center gap-4 py-4">
        <Link to="/" className="flex flex-1 items-center">
          <img src="/logo.png" alt="Horarios" className="h-12 w-auto" />
        </Link>
        <Tabs />
        <div className="flex flex-1 justify-end">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
