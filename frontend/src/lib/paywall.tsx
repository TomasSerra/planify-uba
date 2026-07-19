import { createContext, useContext } from "react";

export type PaywallReason =
  | "catedra"
  | "profesores"
  | "filtros"
  | "favoritos"
  | "planes-limit"
  | "reviews"
  | "general";

export const PaywallContext = createContext<
  ((reason?: PaywallReason) => void) | null
>(null);

export function usePaywall() {
  const open = useContext(PaywallContext);
  if (!open) throw new Error("usePaywall fuera del provider");
  return open;
}
