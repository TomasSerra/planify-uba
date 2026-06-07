import { useQuery, type QueryClient } from "@tanstack/react-query";
import { api } from "./api";
import { useAuth } from "./useAuth";
import type { Me } from "./types";

// Cache de `/me` (carrera + suscripción). Se refresca:
//   - cada 60s si la query es activa,
//   - al volver el foco a la pestaña (cubre sub vencida mid-sesión),
//   - manualmente vía `invalidateQueries` (cambio de carrera, pago acreditado,
//     o 403 del backend que sugiera que la sub ya no es válida).
export function useMe() {
  const {
    user,
    isAuthenticated,
    isLoading: authLoading,
    getAccessTokenSilently,
  } = useAuth();

  return useQuery({
    queryKey: ["me", user?.uid],
    enabled: !authLoading && isAuthenticated,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const token = await getAccessTokenSilently();
      return api.getMe(token);
    },
  });
}

export const meQueryKey = (uid: string | undefined) =>
  ["me", uid] as const;

// Marca al usuario como Pro instantáneamente en todos los lugares de la UI que
// leen useMe/useSubscription, y dispara un refetch para hidratar valid_until.
// No necesita el uid: opera sobre cualquier query con prefijo "me".
export function markProActive(queryClient: QueryClient): void {
  queryClient.setQueriesData<Me | undefined>({ queryKey: ["me"] }, (old) =>
    old
      ? { ...old, subscription: { ...old.subscription, active: true } }
      : old
  );
  queryClient.invalidateQueries({ queryKey: ["me"] });
}
