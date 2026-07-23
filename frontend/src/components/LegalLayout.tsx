// NOTA INTERNA: estas páginas legales son un borrador profesional generado a
// partir del funcionamiento real de la app. Antes de considerarlas definitivas
// deberían ser revisadas por un/a abogado/a matriculado/a.
import type { ReactNode } from "react";
import { Header } from "@/components/Header";
import { Seo } from "@/components/Seo";

export const RESPONSABLE = {
  nombre: "Tomás Serra",
  cuit: "20-44554402-8",
  domicilio: "Ciudad Autónoma de Buenos Aires, Argentina",
  emailLegal: "tomi.serra@gmail.com",
  emailSoporte: "planify.uni@gmail.com",
} as const;

export function LegalLayout({
  title,
  description,
  path,
  lastUpdated,
  children,
}: {
  title: string;
  description: string;
  path: string;
  lastUpdated: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <Seo title={title} description={description} path={path} />
      <Header />
      <main className="container max-w-3xl space-y-6 px-4 pb-16 pt-8 sm:px-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Última actualización: {lastUpdated}
          </p>
        </div>
        <div className="space-y-8">{children}</div>
      </main>
    </div>
  );
}

export function LegalSection({
  n,
  title,
  children,
}: {
  n?: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">
        {n != null ? `${n}. ${title}` : title}
      </h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
