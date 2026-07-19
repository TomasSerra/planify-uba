import { createContext, useContext } from "react";

export interface CareerContextValue {
  // null mientras se está cargando el perfil del usuario autenticado.
  carrera: string | null;
  // Nombre completo del usuario. null mientras carga o si todavía no lo puso.
  nombre: string | null;
  // Nombre legible (e.g. "Licenciatura en Psicología"). null si todavía no
  // hay carrera o si las carreras no terminaron de cargar.
  carreraNombre: string | null;
  // Sedes (código + nombre) en las que dicta la carrera activa. Fallback a
  // las 5 sedes completas mientras /carreras todavía no carga, para evitar
  // un primer render vacío.
  sedesDisponibles: Array<{ codigo: string; nombre: string }>;
  // Persiste según el estado de auth: localStorage para anónimos,
  // PATCH /me/profile para usuarios logueados.
  setCarrera: (slug: string) => Promise<void>;
  openChangeCarrera: () => void;
  // Abre el modal de edición de nombre (solo tiene sentido para cuentas no-Google).
  openChangeNombre: () => void;
  isLoading: boolean;
}

export const CareerContext = createContext<CareerContextValue | null>(null);

export function useCareer(): CareerContextValue {
  const ctx = useContext(CareerContext);
  if (!ctx) throw new Error("useCareer fuera del provider");
  return ctx;
}
