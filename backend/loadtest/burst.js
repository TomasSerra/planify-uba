// Escenario de PICO de concurrencia: VUS requests casi al mismo tiempo.
// Responde "¿qué pasa si justo muchos le dan a Generar en el mismo momento?".
// Los VUs arrancan juntos (con un jitter de 0-3s para no quedar en lockstep
// artificial) y repiten en 4 olas.
//
//   API=https://tu-api.vercel.app k6 run burst.js              # 100 concurrentes (default)
//   API=... VUS=200 k6 run burst.js                            # subir el pico
//   API=... CARRERA=profesorado-psicologia k6 run burst.js     # ver GET /carreras
//
// Reparto (proporcional a VUS): 80% hace 3 materias, 20% hace 4; la mitad de
// cada grupo manda solo_con_cupos + excluir sábado.
import { sleep } from 'k6';
import { fetchMaterias, generarPlan, rand, resumen } from './config.js';

const VUS = Number(__ENV.VUS || 100);

export const options = {
  scenarios: {
    pico: {
      executor: 'per-vu-iterations',
      vus: VUS,
      iterations: 4, // 4 olas de ~VUS concurrentes
      maxDuration: '5m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    'http_req_duration{name:planes}': ['p(95)<5000'],
  },
};

// Perfil determinístico por número de VU para clavar el reparto exacto.
function perfilPorVU(vu) {
  const corte3 = Math.round(VUS * 0.8); // VUs 1..corte3 -> 3 materias (80%)
  if (vu <= corte3) return { n: 3, filtros: vu <= corte3 / 2 };
  return { n: 4, filtros: vu <= corte3 + (VUS - corte3) / 2 };
}

export function setup() {
  return fetchMaterias();
}

export default function (codigos) {
  sleep(rand(0, 3)); // jitter chico: arrancan casi juntos
  generarPlan(codigos, perfilPorVU(__VU));
}

// Al terminar: resumen en consola + burst-reporte.html + burst-resumen.json
export const handleSummary = resumen('burst');
