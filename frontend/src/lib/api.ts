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

// Cache de listMaterias en localStorage: el scraper corre diario, los datos
// son estables. Evita pegarle al BE cada vez que se monta el selector.
const MATERIAS_TTL_MS = 60 * 60 * 1000;
// Bumpear cuando cambie el shape de MateriaListItem (campo nuevo, rename,
// etc.) para invalidar caches viejas sin esperar el TTL.
const MATERIAS_CACHE_VERSION = 1;

function readMateriasCache(key: string): MateriaListItem[] | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, expires, version } = JSON.parse(raw);
    if (version !== MATERIAS_CACHE_VERSION) return null;
    if (typeof expires !== "number" || expires < Date.now()) return null;
    return data as MateriaListItem[];
  } catch {
    return null;
  }
}

function writeMateriasCache(key: string, data: MateriaListItem[]): void {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        data,
        expires: Date.now() + MATERIAS_TTL_MS,
        version: MATERIAS_CACHE_VERSION,
      })
    );
  } catch {
    /* localStorage lleno o deshabilitado: degradamos silenciosamente */
  }
}

export const api = {
  listCarreras: () => request<Carrera[]>("/carreras"),
  // Filtro por nombre ocurre client-side en MateriaSelector vía cmdk; acá solo
  // cacheamos el listado completo (con TTL) por carrera.
  listMateriasCached: async (carrera?: string): Promise<MateriaListItem[]> => {
    const key = `materias:${carrera ?? "all"}`;
    const cached = readMateriasCache(key);
    if (cached) return cached;
    const data = await request<MateriaListItem[]>(
      `/materias${carrera ? `?carrera=${encodeURIComponent(carrera)}` : ""}`
    );
    writeMateriasCache(key, data);
    return data;
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
  postCheckout: (token: string, flow: "redirect" | "qr" = "redirect") =>
    request<CheckoutResponse>(
      "/pagos/checkout",
      { method: "POST", body: JSON.stringify({ flow }) },
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
