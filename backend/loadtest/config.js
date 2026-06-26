// Configuración y helpers compartidos por los escenarios de carga (k6).
// Apunta SIEMPRE a producción vía la variable de entorno API:
//
//   API=https://tu-api.vercel.app k6 run realistic.js
//
// /planes es read-only y anónimo: estos tests NO escriben datos ni tocan
// Mercado Pago. solo_con_cupos y excluir sábado son features gratis (no
// gatean Pro), así que todo corre sin token de auth.
import http from 'k6/http';
import { check } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

// Métricas custom para ver el rendimiento desglosado por perfil de uso.
// El 2º arg `true` formatea como tiempo (ms) en el resumen.
const durPlanes = new Trend('planes_latencia', true);
const dur3mat = new Trend('planes_3_materias', true);
const dur4mat = new Trend('planes_4_materias', true);
const durConFiltros = new Trend('planes_con_filtros', true);
const durSinFiltros = new Trend('planes_sin_filtros', true);
const planesOk = new Rate('planes_exito');
const combosGenerados = new Trend('combos_evaluados'); // total_generados del response

// Contadores de error por tipo, para saber POR QUÉ falló un request.
// Se crean acá (init context) porque k6 no permite crear métricas en runtime.
const errores = {
  0: new Counter('err_timeout_o_red'), // status 0 = la función no respondió / sin red
  429: new Counter('err_429_rate_limit'),
  500: new Counter('err_500_server'), // probable pool de conexiones agotado
  502: new Counter('err_502_bad_gateway'), // instancia caída / cold start
  503: new Counter('err_503_no_disponible'),
  504: new Counter('err_504_timeout_funcion'), // generación más larga que el límite de Vercel
};
const errOtro = new Counter('err_otro');

export const API = __ENV.API;
// Slugs válidos (ver GET /carreras): licenciatura-psicologia,
// profesorado-psicologia, licenciatura-musicoterapia, licenciatura-terap-ocup.
export const CARRERA = __ENV.CARRERA || 'licenciatura-psicologia'; // la más grande (116 materias)

if (!API) {
  throw new Error(
    'Falta la variable API. Ej: API=https://tu-api.vercel.app k6 run realistic.js'
  );
}

// Trae los códigos de materia reales una sola vez (se llama desde setup()).
export function fetchMaterias() {
  const res = http.get(`${API}/materias?carrera=${CARRERA}`);
  if (res.status !== 200) {
    throw new Error(`GET /materias devolvió ${res.status}: ${res.body}`);
  }
  const codigos = JSON.parse(res.body).map((m) => m.codigo);
  if (codigos.length < 4) {
    throw new Error(`Carrera ${CARRERA} tiene ${codigos.length} materias; no alcanza`);
  }
  return codigos;
}

export function rand(min, max) {
  return min + Math.random() * (max - min);
}

// n códigos de materia distintos al azar.
function sample(codigos, n) {
  const pool = [...codigos];
  const out = [];
  for (let i = 0; i < n && pool.length; i++) {
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return out;
}

// Dispara un POST /planes según el perfil { n, filtros }.
// filtros=true -> solo_con_cupos + excluir sábado (ambos gratis).
export function generarPlan(codigos, perfil) {
  const body = {
    materias: sample(codigos, perfil.n).map((codigo) => ({ codigo })),
    max_planes: 15,
  };
  if (perfil.filtros) {
    body.solo_con_cupos = true;
    body.dias_excluidos = ['sabado'];
  }
  const res = http.post(`${API}/planes`, JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    tags: {
      name: 'planes',
      grupo: `${perfil.n}mat`,
      filtros: perfil.filtros ? 'si' : 'no',
    },
  });
  check(res, {
    'status 200': (r) => r.status === 200,
    'devuelve planes': (r) => r.status === 200 && r.body.includes('total_generados'),
  });

  // Registrar métricas custom para el resumen final.
  const ok = res.status === 200;
  planesOk.add(ok);
  durPlanes.add(res.timings.duration);
  (perfil.n === 3 ? dur3mat : dur4mat).add(res.timings.duration);
  (perfil.filtros ? durConFiltros : durSinFiltros).add(res.timings.duration);
  if (ok) {
    try {
      combosGenerados.add(JSON.parse(res.body).total_generados);
    } catch (_) {
      // body no parseable: lo ignoramos, el check ya lo marcó como fallo.
    }
  } else {
    (errores[res.status] || errOtro).add(1);
  }
  return res;
}

// 80% -> 3 materias, 20% -> 4 materias; la mitad de cada grupo con filtros.
export function perfilAleatorio() {
  const n = Math.random() < 0.8 ? 3 : 4;
  return { n, filtros: Math.random() < 0.5 };
}

// ---------- Reporte HTML custom ----------

function _val(data, name, key) {
  const m = data.metrics[name];
  return m && m.values ? m.values[key] : undefined;
}

function _ms(v) {
  if (v == null || isNaN(v)) return '—';
  return v >= 1000 ? (v / 1000).toFixed(2) + ' s' : Math.round(v) + ' ms';
}

function _pct(r) {
  if (r == null) return '—';
  return (r * 100).toFixed(2) + '%';
}

function _tabla(headers, filas) {
  const th = headers.map((h) => `<th>${h}</th>`).join('');
  const tr = filas
    .map((f) => '<tr>' + f.map((c) => `<td>${c}</td>`).join('') + '</tr>')
    .join('');
  return `<table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`;
}

const _ERR_LABEL = {
  err_timeout_o_red: 'Timeout / sin respuesta (la función no contestó a tiempo)',
  err_429_rate_limit: '429 — rate limit de Vercel',
  err_500_server: '500 — error interno (probable pool de conexiones agotado)',
  err_502_bad_gateway: '502 — bad gateway (instancia caída o cold start)',
  err_503_no_disponible: '503 — servicio no disponible',
  err_504_timeout_funcion: '504 — timeout de función Vercel (generación demasiado larga)',
  err_otro: 'Otro error',
};

function construirHtml(nombre, data, fechaLegible) {
  const vus = _val(data, 'vus_max', 'value');
  const reqs = _val(data, 'http_reqs', 'count');
  const rps = _val(data, 'http_reqs', 'rate');
  const okFails = _val(data, 'planes_exito', 'fails') || 0;
  const totalPlanes = (_val(data, 'planes_exito', 'passes') || 0) + okFails;
  const exito = _val(data, 'planes_exito', 'rate');

  // Umbrales incumplidos.
  const breaches = [];
  for (const [name, m] of Object.entries(data.metrics)) {
    if (m.thresholds) {
      for (const [expr, res] of Object.entries(m.thresholds)) {
        if (res.ok === false) breaches.push(`${name} — ${expr}`);
      }
    }
  }

  // Errores por tipo (solo los que ocurrieron).
  const erroresPorTipo = Object.entries(_ERR_LABEL)
    .map(([k, label]) => [label, _val(data, k, 'count') || 0])
    .filter(([, c]) => c > 0);

  const fallo = breaches.length > 0;
  const colorVerdicto = fallo ? '#c0392b' : '#1e8449';

  let porque = '';
  if (breaches.length) {
    porque +=
      `<p><strong>Umbrales incumplidos:</strong></p><ul>` +
      breaches.map((b) => `<li>${b}</li>`).join('') +
      `</ul>`;
  }
  if (erroresPorTipo.length) {
    porque +=
      `<p><strong>Requests con error (${okFails} de ${totalPlanes}):</strong></p>` +
      _tabla(['Tipo de error', 'Cantidad'], erroresPorTipo.map(([l, c]) => [l, c]));
  }
  if (!breaches.length && !okFails) {
    porque = '<p class="ok">✓ Sin errores y todos los umbrales cumplidos.</p>';
  } else if (!breaches.length && okFails) {
    porque += `<p class="warn">⚠ Hubo ${okFails} error(es) (${_pct(
      1 - exito
    )}) pero dentro del umbral tolerado.</p>`;
  }

  const cards = [
    ['Concurrencia', vus + ' VUs'],
    ['Requests /planes', totalPlanes],
    ['Éxito', _pct(exito)],
    ['Errores', okFails],
    ['Latencia mediana', _ms(_val(data, 'planes_latencia', 'med'))],
    ['Latencia p95', _ms(_val(data, 'planes_latencia', 'p(95)'))],
    ['Latencia máxima', _ms(_val(data, 'planes_latencia', 'max'))],
    ['Requests/seg', rps ? rps.toFixed(1) : '—'],
  ]
    .map(
      ([k, v]) =>
        `<div class="card"><div class="card-v">${v}</div><div class="card-k">${k}</div></div>`
    )
    .join('');

  const latGen = _tabla(
    ['', 'Promedio', 'Mín', 'Mediana', 'p90', 'p95', 'Máx'],
    [
      [
        'Latencia /planes',
        _ms(_val(data, 'planes_latencia', 'avg')),
        _ms(_val(data, 'planes_latencia', 'min')),
        _ms(_val(data, 'planes_latencia', 'med')),
        _ms(_val(data, 'planes_latencia', 'p(90)')),
        _ms(_val(data, 'planes_latencia', 'p(95)')),
        _ms(_val(data, 'planes_latencia', 'max')),
      ],
    ]
  );

  const latPerfil = _tabla(
    ['Perfil', 'Mediana', 'p95', 'Máx'],
    [
      ['3 materias', 'planes_3_materias'],
      ['4 materias', 'planes_4_materias'],
      ['Con filtros (cupos + sin sábado)', 'planes_con_filtros'],
      ['Sin filtros', 'planes_sin_filtros'],
    ].map(([label, metric]) => [
      label,
      _ms(_val(data, metric, 'med')),
      _ms(_val(data, metric, 'p(95)')),
      _ms(_val(data, metric, 'max')),
    ])
  );

  const combos = _tabla(
    ['', 'Promedio', 'Mediana', 'p95', 'Máx'],
    [
      [
        'Combos evaluados',
        Math.round(_val(data, 'combos_evaluados', 'avg') || 0),
        Math.round(_val(data, 'combos_evaluados', 'med') || 0),
        Math.round(_val(data, 'combos_evaluados', 'p(95)') || 0),
        Math.round(_val(data, 'combos_evaluados', 'max') || 0),
      ],
    ]
  );

  const red = _tabla(
    ['', 'Promedio', 'Máx'],
    [
      ['Espera (blocked)', _ms(_val(data, 'http_req_blocked', 'avg')), _ms(_val(data, 'http_req_blocked', 'max'))],
      ['Conexión TCP', _ms(_val(data, 'http_req_connecting', 'avg')), _ms(_val(data, 'http_req_connecting', 'max'))],
      ['Handshake TLS', _ms(_val(data, 'http_req_tls_handshaking', 'avg')), _ms(_val(data, 'http_req_tls_handshaking', 'max'))],
    ]
  );

  const umbralRows = [];
  for (const [name, m] of Object.entries(data.metrics)) {
    if (m.thresholds) {
      for (const [expr, res] of Object.entries(m.thresholds)) {
        umbralRows.push([name, expr, res.ok ? '✓ OK' : '✗ FALLÓ']);
      }
    }
  }
  const umbrales = _tabla(['Métrica', 'Umbral', 'Resultado'], umbralRows);

  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>Reporte de carga — ${nombre}</title>
<style>
  body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;margin:0;background:#f6f6f8;color:#222}
  .wrap{max-width:880px;margin:0 auto;padding:24px}
  h1{font-size:22px;margin:0 0 4px} h2{font-size:16px;margin:28px 0 10px;color:#861f5c}
  .meta{color:#666;font-size:13px;margin-bottom:18px}
  .verdicto{font-size:28px;font-weight:700;color:#fff;background:${colorVerdicto};padding:14px 20px;border-radius:10px}
  .porque{background:#fff;border:1px solid #e5e5ea;border-radius:10px;padding:14px 18px;margin-top:14px;font-size:14px}
  .porque ul{margin:6px 0 0 18px} .ok{color:#1e8449;font-weight:600} .warn{color:#b9770e;font-weight:600}
  .cards{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:8px}
  .card{background:#fff;border:1px solid #e5e5ea;border-radius:10px;padding:12px;text-align:center}
  .card-v{font-size:20px;font-weight:700} .card-k{font-size:12px;color:#666;margin-top:2px}
  table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e5e5ea;border-radius:8px;overflow:hidden;font-size:13px}
  th,td{padding:8px 10px;text-align:right;border-bottom:1px solid #f0f0f3} th{background:#fafafa;color:#555}
  th:first-child,td:first-child{text-align:left}
  details{margin-top:10px} summary{cursor:pointer;font-weight:600;color:#861f5c}
</style></head><body><div class="wrap">
  <h1>Reporte de carga — ${nombre}</h1>
  <div class="meta">${fechaLegible} · ${API} · ${vus} usuarios concurrentes · ${reqs} requests totales</div>

  <div class="verdicto">${fallo ? 'FALLÓ' : 'PASÓ'}</div>
  <div class="porque"><h2 style="margin-top:0">¿Por qué?</h2>${porque}</div>

  <h2>Resumen</h2>
  <div class="cards">${cards}</div>

  <h2>Detalle</h2>
  <details open><summary>Latencia general</summary>${latGen}</details>
  <details><summary>Latencia por perfil de uso</summary>${latPerfil}</details>
  <details><summary>Trabajo del generador (combos evaluados)</summary>${combos}
    <p class="meta">Combos que el algoritmo examinó por request. Alto = materias que combinan mucho; 0 = sin combinación válida posible.</p></details>
  <details><summary>Red y conexión</summary>${red}
    <p class="meta">Picos altos acá suelen ser cold starts de Vercel (instancias nuevas).</p></details>
  <details><summary>Umbrales</summary>${umbrales}</details>
</div></body></html>`;
}

// Genera el resumen final: tabla en consola + reporte HTML (Resumen simple +
// Detalle completo + por qué falló) + JSON crudo, ambos en reportes/ con la
// fecha en el nombre.  Uso:  export const handleSummary = resumen('realistic');
export function resumen(nombre) {
  return function (data) {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    const stamp = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
    const fechaLegible = `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
    const base = `reportes/${nombre}-${stamp}`;
    return {
      stdout: textSummary(data, { indent: '  ', enableColors: true }),
      [`${base}.html`]: construirHtml(nombre, data, fechaLegible),
      [`${base}.json`]: JSON.stringify(data, null, 2),
    };
  };
}
