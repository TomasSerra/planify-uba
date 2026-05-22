import { useAuth } from "./useAuth";
import { useMe } from "./useMe";

// Wrapper sobre useMe(): selecciona el bloque `subscription` y expone el mismo
// contrato que tenían los call sites originales. No genera una request propia.
export function useSubscription() {
  const { isAuthenticated, isLoading: userLoading } = useAuth();
  const me = useMe();

  if (userLoading) {
    return { isPaid: false, validUntil: null as Date | null, isLoading: true };
  }
  if (!isAuthenticated) {
    return { isPaid: false, validUntil: null as Date | null, isLoading: false };
  }

  const sub = me.data?.subscription;
  return {
    isPaid: !!sub?.active,
    validUntil: sub?.valid_until ? new Date(sub.valid_until) : null,
    isLoading: me.isLoading,
  };
}
