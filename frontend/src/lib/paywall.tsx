import { createContext, useContext } from "react";

export const PaywallContext = createContext<(() => void) | null>(null);

export function usePaywall() {
  const open = useContext(PaywallContext);
  if (!open) throw new Error("usePaywall fuera del provider");
  return open;
}
