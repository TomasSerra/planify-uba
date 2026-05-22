import type {
  Carrera,
  Favorite,
  FavoriteFilters,
  MateriaListItem,
  MateriaOpciones,
  Me,
  Plan,
  PlanRequest,
  PlanResponse,
  UserProfile,
} from "./types";

export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request<T>(
  path: string,
  init?: RequestInit,
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init?.headers as Record<string, string>) || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      /* ignore */
    }
    throw new Error(`${res.status} ${detail}`);
  }
  return res.json() as Promise<T>;
}

export interface CheckoutResponse {
  init_point: string;
  external_reference: string;
}

export interface PagoStatus {
  status: "pending" | "approved";
}

export const api = {
  listCarreras: () => request<Carrera[]>("/carreras"),
  listMaterias: (opts?: { q?: string; carrera?: string }) => {
    const params = new URLSearchParams();
    if (opts?.q) params.set("q", opts.q);
    if (opts?.carrera) params.set("carrera", opts.carrera);
    const qs = params.toString();
    return request<MateriaListItem[]>(`/materias${qs ? `?${qs}` : ""}`);
  },
  getMateriaOpciones: (codigo: number) =>
    request<MateriaOpciones>(`/materias/${codigo}/opciones`),
  getMe: (token: string) => request<Me>("/me", undefined, token),
  updateProfile: (carrera: string, token: string) =>
    request<UserProfile>(
      "/me/profile",
      { method: "PATCH", body: JSON.stringify({ carrera }) },
      token
    ),
  postPlanes: (req: PlanRequest, token?: string | null) =>
    request<PlanResponse>(
      "/planes",
      { method: "POST", body: JSON.stringify(req) },
      token ?? undefined
    ),
  postCheckout: (token: string) =>
    request<CheckoutResponse>(
      "/pagos/checkout",
      { method: "POST" },
      token
    ),
  getPagoStatus: (externalReference: string) =>
    request<PagoStatus>(`/pagos/${externalReference}/status`),
  listFavoritos: (token: string) =>
    request<{ favorites: Favorite[] }>("/favoritos", undefined, token),
  addFavorito: (plan: Plan, filters: FavoriteFilters | null, token: string) =>
    request<{ id: number; created_at: string }>(
      "/favoritos",
      { method: "POST", body: JSON.stringify({ plan, filters }) },
      token
    ),
  deleteFavorito: (id: number, token: string) =>
    request<{ ok: boolean }>(
      `/favoritos/${id}`,
      { method: "DELETE" },
      token
    ),
};
