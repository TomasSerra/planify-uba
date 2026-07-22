import { Helmet } from "react-helmet-async";

const SITE_URL = (
  import.meta.env.VITE_SITE_URL || "https://planify-uba.vercel.app"
).replace(/\/$/, "");

const DEFAULT_IMAGE = "/og-image.png";

type Props = {
  title: string;
  description: string;
  // Ruta canónica (ej. "/recomendaciones"). Se resuelve contra SITE_URL.
  path: string;
  image?: string;
  noindex?: boolean;
  // Objeto o array JSON-LD. Se serializa tal cual dentro de un <script>.
  jsonLd?: object | object[];
};

export function Seo({
  title,
  description,
  path,
  image = DEFAULT_IMAGE,
  noindex,
  jsonLd,
}: Props) {
  const url = SITE_URL + (path === "/" ? "/" : path);
  const imageUrl = image.startsWith("http") ? image : SITE_URL + image;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex,follow" />}

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Planify" />
      <meta property="og:locale" content="es_AR" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={imageUrl} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />

      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
}
