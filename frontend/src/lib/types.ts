export type TipoCurso = "teorico" | "seminario" | "comision";

export interface MateriaListItem {
  codigo: number;
  nombre: string;
  cant_catedras: number;
}

export interface CursoSummary {
  id: number;
  tipo: TipoCurso | string;
  codigo: string;
  dia: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  aula: string | null;
}

export interface CursoEnPlan extends CursoSummary {
  catedra_id: number;
  profesor: string | null;
  sede: string | null;
}

export interface OpcionMateria {
  materia_codigo: number;
  materia_nombre: string;
  catedra_id: number;
  catedra_numero: string | null;
  catedra_titular: string | null;
  cursos: CursoEnPlan[];
}

export interface Plan {
  opciones: OpcionMateria[];
}

export interface FranjaExcluida {
  dias: string[];
  hora_inicio: string; // "HH:MM"
  hora_fin: string;
}

export interface MateriaSeleccionada {
  codigo: number;
  catedra_id: number | null;
  // null = todos (sin filtro). [] = ninguno (sin opciones para esa materia).
  // Lista no vacía = subset explícito.
  profesores: string[] | null;
}

export interface PlanRequest {
  materias: MateriaSeleccionada[];
  dias_excluidos?: string[];
  franjas_excluidas?: FranjaExcluida[];
  sedes_permitidas?: string[];
  max_planes?: number;
}

export interface CatedraOpcion {
  id: number;
  numero: string | null;
  titular: string | null;
  cuatrimestre: string | null;
  profesores: string[];
}

export interface MateriaOpciones {
  codigo: number;
  nombre: string;
  catedras: CatedraOpcion[];
}

export interface PlanResponse {
  planes: Plan[];
  total_generados: number;
  materias_sin_opciones: number[];
}

export const DIAS = [
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
] as const;

export const SEDES: Array<{ codigo: string; nombre: string }> = [
  { codigo: "HY", nombre: "Hipólito Yrigoyen" },
  { codigo: "IN", nombre: "Independencia" },
  { codigo: "SI", nombre: "San Isidro" },
  { codigo: "AV", nombre: "Avellaneda" },
  { codigo: "EC", nombre: "Eco" },
];
