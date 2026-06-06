// Mapa de slug de carrera → imagen del plan en public/planes-de-estudio/.
// Para agregar una nueva carrera: tirar el .webp en esa carpeta con el slug
// como nombre y sumar una línea acá. El slug tiene que coincidir con el de
// la tabla `carreras` del BE.
export const PLAN_IMAGES: Record<string, string> = {
  "licenciatura-psicologia": "/planes-de-estudio/licenciatura-psicologia.webp",
  "profesorado-psicologia": "/planes-de-estudio/profesorado-psicologia.webp",
  "licenciatura-musicoterapia":
    "/planes-de-estudio/licenciatura-musicoterapia.webp",
  "licenciatura-terap-ocup":
    "/planes-de-estudio/licenciatura-terap-ocup.webp",
};

export function hasPlanImage(slug: string | null): boolean {
  return slug !== null && slug in PLAN_IMAGES;
}
