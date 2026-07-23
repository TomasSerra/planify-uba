// Genera public/sitemap.xml en build: rutas estáticas + una URL por cada cátedra
// con reseñas (/catedras/:id), que son las páginas de contenido para las queries
// de "recomendaciones cátedras/profesores". Pega a la API de producción
// (server-to-server, sin CORS). Es best-effort: si la API no responde, deja el
// sitemap estático existente y NO rompe el build.
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../public/sitemap.xml");

const SITE_URL = (
  process.env.VITE_SITE_URL || "https://planify-uba.vercel.app"
).replace(/\/$/, "");
const API_URL = (process.env.VITE_API_URL || "").replace(/\/$/, "");

const STATIC_ROUTES = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/recomendaciones", changefreq: "daily", priority: "0.9" },
  { path: "/planes-estudio", changefreq: "monthly", priority: "0.7" },
  { path: "/terminos", changefreq: "yearly", priority: "0.3" },
  { path: "/privacidad", changefreq: "yearly", priority: "0.3" },
];

function xml(urls) {
  const body = urls
    .map(
      (u) =>
        `  <url>\n    <loc>${SITE_URL}${u.path}</loc>\n` +
        (u.changefreq ? `    <changefreq>${u.changefreq}</changefreq>\n` : "") +
        (u.priority ? `    <priority>${u.priority}</priority>\n` : "") +
        `  </url>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

async function fetchCatedraIds() {
  const carreras = await fetch(`${API_URL}/carreras`).then((r) => r.json());
  const ids = new Set();
  for (const c of carreras) {
    for (let page = 1; page < 100; page++) {
      const res = await fetch(
        `${API_URL}/catedras?carrera=${encodeURIComponent(c.slug)}&page=${page}`
      ).then((r) => r.json());
      for (const item of res.items ?? []) {
        // Solo cátedras con al menos una reseña: tienen contenido indexable.
        if (item.review_count > 0) ids.add(item.catedra_id);
      }
      if (page * res.page_size >= res.total) break;
    }
  }
  return [...ids];
}

async function main() {
  if (!API_URL || API_URL.includes("localhost")) {
    console.log(
      "[gen-sitemap] VITE_API_URL ausente o local; dejo el sitemap estático."
    );
    return;
  }
  try {
    const ids = await fetchCatedraIds();
    const urls = [
      ...STATIC_ROUTES,
      ...ids.map((id) => ({
        path: `/catedras/${id}`,
        changefreq: "weekly",
        priority: "0.6",
      })),
    ];
    await writeFile(OUT, xml(urls), "utf8");
    console.log(`[gen-sitemap] OK: ${urls.length} URLs (${ids.length} cátedras).`);
  } catch (err) {
    console.warn(
      `[gen-sitemap] falló (${err?.message ?? err}); dejo el sitemap estático.`
    );
  }
}

main();
