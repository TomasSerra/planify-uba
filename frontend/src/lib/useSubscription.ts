import { useAuth, useUser } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

export function useSubscription() {
  const { user, isLoaded: userLoaded } = useUser();
  const { getToken } = useAuth();

  const query = useQuery({
    queryKey: ["subscription", user?.id],
    enabled: userLoaded && !!user,
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("No token");
      return api.getSubscription(token);
    },
  });

  if (!userLoaded) {
    // Aún no sabemos si hay sesión: marcar como cargando para que el FE
    // pueda mostrar skeletons en vez del estado "free" prematuramente.
    return { isPaid: false, validUntil: null as Date | null, isLoading: true };
  }
  if (!user) {
    return { isPaid: false, validUntil: null as Date | null, isLoading: false };
  }

  const data = query.data;
  return {
    isPaid: !!data?.active,
    validUntil: data?.valid_until ? new Date(data.valid_until) : null,
    isLoading: query.isLoading,
  };
}
