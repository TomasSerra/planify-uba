// Escenario REALISTA: 50 usuarios que NO arrancan todos juntos.
// Cada uno llega en un momento al azar dentro de una ventana (default 8 min),
// así las diferencias entre arribos rondan los 10-30s y el solapamiento se da
// de forma natural cuando varios caen cerca. Cada usuario genera 2 veces
// (simula tocar restricciones y volver a generar).
//
//   API=https://tu-api.vercel.app k6 run realistic.js
//   API=... VENTANA=480 k6 run realistic.js   # ventana de arribos en segundos
//   API=... CARRERA=profesorado-psicologia k6 run realistic.js   # otra carrera (ver GET /carreras)
//
// Reparto: 80% genera con 3 materias, 20% con 4; la mitad de cada grupo manda
// solo_con_cupos + excluir sábado.
import { sleep } from 'k6';
import { fetchMaterias, generarPlan, perfilAleatorio, rand, resumen } from './config.js';

const VENTANA = Number(__ENV.VENTANA || 480); // seg sobre los que se reparten los arribos

export const options = {
  scenarios: {
    realista: {
      executor: 'per-vu-iterations',
      vus: 50,
      iterations: 1,
      maxDuration: '15m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'], // <2% de requests fallidos
    'http_req_duration{name:planes}': ['p(95)<3000', 'p(99)<6000'],
  },
};

export function setup() {
  return fetchMaterias();
}

// Al terminar: resumen en consola + realistic-reporte.html + realistic-resumen.json
export const handleSummary = resumen('realistic');

export default function (codigos) {
  // Arribo escalonado: cada usuario espera un offset al azar dentro de la ventana.
  sleep(rand(0, VENTANA));

  const perfil = perfilAleatorio();
  generarPlan(codigos, perfil);

  // Piensa, ajusta restricciones y regenera (mismo perfil).
  sleep(rand(10, 30));
  generarPlan(codigos, perfil);
}
