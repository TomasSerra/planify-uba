import { Link } from "react-router-dom";
import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  LegalLayout,
  LegalSection,
  LegalList,
  RESPONSABLE,
} from "@/components/LegalLayout";

const LAST_UPDATED = "23 de julio de 2026";

const linkClass = "font-medium text-primary underline-offset-4 hover:underline";

const SUBJECT = "Solicitud de revocación de compra (arrepentimiento) — Planify";
const BODY = `Hola,

Deseo ejercer mi derecho de arrepentimiento (art. 34 de la Ley 24.240) y revocar la compra de la suscripción Pro de Planify.

Mis datos:
- Nombre y apellido:
- Email de la cuenta:
- Fecha de la compra:
- ID de pago de Mercado Pago (si lo tenés a mano):

Solicito el reintegro del importe abonado. Gracias.`;

const MAILTO = `mailto:${RESPONSABLE.emailSoporte}?subject=${encodeURIComponent(
  SUBJECT
)}&body=${encodeURIComponent(BODY)}`;

export function Arrepentimiento() {
  return (
    <LegalLayout
      title="Botón de arrepentimiento"
      description="Ejercé tu derecho de arrepentimiento y revocá la compra de la suscripción Pro de Planify dentro de los 10 días corridos."
      path="/arrepentimiento"
      lastUpdated={LAST_UPDATED}
    >
      <LegalSection title="Tu derecho de arrepentimiento">
        <p>
          De acuerdo con el artículo 34 de la Ley N° 24.240 de Defensa del
          Consumidor y la Resolución N° 424/2020 de la Secretaría de Comercio
          Interior, si contrataste la suscripción Pro de Planify tenés derecho a{" "}
          <strong>
            revocar la compra dentro de los diez (10) días corridos
          </strong>{" "}
          contados a partir de la contratación, sin necesidad de expresar el
          motivo y sin costo ni penalidad alguna.
        </p>
      </LegalSection>

      <LegalSection title="Cómo funciona">
        <LegalList
          items={[
            "El ejercicio de este derecho es gratuito y no requiere justificación.",
            "Una vez recibida y validada tu solicitud dentro del plazo legal, se te reintegrará el importe abonado a través del mismo medio de pago (Mercado Pago).",
            "El reintegro se acreditará según los plazos operativos que establezca Mercado Pago para ese tipo de operación.",
          ]}
        />
      </LegalSection>

      <LegalSection title="Solicitá la revocación">
        <p>
          Presioná el siguiente botón para generar automáticamente un correo con
          tu solicitud dirigido a nuestro equipo. Solo tenés que completar tus
          datos y enviarlo.
        </p>
        <div className="pt-1">
          <Button asChild size="lg">
            <a href={MAILTO}>
              <Undo2 className="size-4" />
              Botón de arrepentimiento
            </a>
          </Button>
        </div>
        <p className="text-xs">
          Si el botón no abre tu cliente de correo, escribinos manualmente a{" "}
          <a href={`mailto:${RESPONSABLE.emailSoporte}`} className={linkClass}>
            {RESPONSABLE.emailSoporte}
          </a>{" "}
          indicando el email de tu cuenta y la fecha de la compra.
        </p>
      </LegalSection>

      <LegalSection title="Más información">
        <p>
          Podés consultar las condiciones completas de contratación y reintegro
          en nuestros{" "}
          <Link to="/terminos" className={linkClass}>
            Términos y Condiciones
          </Link>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
