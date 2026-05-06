import { useAuth0 } from "@auth0/auth0-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

export function useSubscription() {
  const {
    user,
    isAuthenticated,
    isLoading: userLoading,
    getAccessTokenSilently,
  } = useAuth0();

  const query = useQuery({
    queryKey: ["subscription", user?.sub],
    enabled: !userLoading && isAuthenticated,
    queryFn: async () => {
      const token = await getAccessTokenSilently();
      return api.getSubscription(token);
    },
  });

  if (userLoading) {
    // Aún no sabemos si hay sesión: marcar como cargando para que el FE
    // pueda mostrar skeletons en vez del estado "free" prematuramente.
    return { isPaid: false, validUntil: null as Date | null, isLoading: true };
  }
  if (!isAuthenticated) {
    return { isPaid: false, validUntil: null as Date | null, isLoading: false };
  }

  const data = query.data;
  return {
    isPaid: !!data?.active,
    validUntil: data?.valid_until ? new Date(data.valid_until) : null,
    isLoading: query.isLoading,
  };
}
