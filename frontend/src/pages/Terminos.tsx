import { Link } from "react-router-dom";
import {
  LegalLayout,
  LegalSection,
  LegalList,
  RESPONSABLE,
} from "@/components/LegalLayout";

const LAST_UPDATED = "23 de julio de 2026";

const linkClass = "font-medium text-primary underline-offset-4 hover:underline";

export function Terminos() {
  return (
    <LegalLayout
      title="Términos y Condiciones"
      description="Términos y Condiciones de uso de Planify, la herramienta para armar horarios de las carreras de la Facultad de Psicología (UBA)."
      path="/terminos"
      lastUpdated={LAST_UPDATED}
    >
      <p className="text-sm leading-relaxed text-muted-foreground">
        Los presentes Términos y Condiciones (en adelante, los{" "}
        <strong>&ldquo;Términos&rdquo;</strong>) regulan el acceso y la
        utilización del sitio web y la aplicación <strong>Planify</strong> (en
        adelante, el <strong>&ldquo;Servicio&rdquo;</strong> o la{" "}
        <strong>&ldquo;Plataforma&rdquo;</strong>). El uso del Servicio implica
        la aceptación plena y sin reservas de todas y cada una de las
        disposiciones aquí incluidas. Si no está de acuerdo con estos Términos,
        le solicitamos que no utilice la Plataforma.
      </p>

      <LegalSection n={1} title="Identificación del responsable">
        <p>
          El Servicio es operado por <strong>{RESPONSABLE.nombre}</strong>,
          persona humana, CUIT {RESPONSABLE.cuit}, con domicilio en{" "}
          {RESPONSABLE.domicilio} (en adelante, el{" "}
          <strong>&ldquo;Titular&rdquo;</strong>).
        </p>
        <p>
          Correo electrónico de contacto:{" "}
          <a href={`mailto:${RESPONSABLE.emailSoporte}`} className={linkClass}>
            {RESPONSABLE.emailSoporte}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection n={2} title="Objeto y descripción del Servicio">
        <p>
          Planify es una herramienta que asiste a estudiantes en la
          organización de su cursada, generando combinaciones posibles de
          horarios a partir de las materias, cátedras, comisiones y profesores
          seleccionados por el usuario, aplicando las restricciones que este
          elija (días, franjas horarias, sedes, entre otras). El Servicio
          contempla las carreras de la Facultad de Psicología de la Universidad
          de Buenos Aires: Licenciatura en Psicología, Profesorado en
          Psicología, Licenciatura en Musicoterapia y Licenciatura en Terapia
          Ocupacional.
        </p>
        <p>
          El Servicio tiene una finalidad exclusivamente informativa y de
          asistencia en la planificación. No constituye un canal de inscripción
          a materias ni reemplaza los sistemas oficiales de la Facultad.
        </p>
      </LegalSection>

      <LegalSection n={3} title="Ausencia de vínculo con la UBA">
        <p>
          Planify es un desarrollo <strong>independiente y no oficial</strong>.
          No se encuentra afiliado, asociado, autorizado, patrocinado ni avalado
          por la Universidad de Buenos Aires, por la Facultad de Psicología ni
          por ninguna de sus dependencias o autoridades. Las denominaciones de
          carreras, materias y cátedras se utilizan con fines meramente
          descriptivos e identificatorios. La información sobre la oferta
          académica se obtiene de fuentes públicas de la Facultad; la fuente
          oficial y prevaleciente es, en todos los casos, la propia Facultad.
        </p>
      </LegalSection>

      <LegalSection n={4} title="Carácter informativo y exactitud de los datos">
        <p>
          La información de horarios, cátedras, comisiones, docentes, aulas y
          sedes se recopila de fuentes públicas de manera automatizada y puede
          contener errores, omisiones o encontrarse desactualizada respecto de
          la información oficial vigente. El Titular realiza esfuerzos
          razonables para mantener los datos actualizados, pero{" "}
          <strong>
            no garantiza la exactitud, integridad ni vigencia de la información
          </strong>
          .
        </p>
        <p>
          El usuario es el único responsable de verificar la información
          definitiva de su cursada e inscripción ante los canales oficiales de
          la Facultad de Psicología (UBA) antes de tomar cualquier decisión. El
          Titular no será responsable por decisiones adoptadas sobre la base de
          la información provista por la Plataforma.
        </p>
      </LegalSection>

      <LegalSection n={5} title="Registración, cuenta y uso">
        <p>
          Ciertas funcionalidades requieren la creación de una cuenta mediante
          correo electrónico y contraseña o mediante el inicio de sesión con
          Google. La autenticación se gestiona a través de Firebase
          Authentication (Google LLC).
        </p>
        <LegalList
          items={[
            "El usuario se compromete a proporcionar información veraz y a mantenerla actualizada.",
            "El usuario es responsable de resguardar la confidencialidad de sus credenciales y de toda actividad realizada desde su cuenta.",
            "El Servicio está dirigido a personas mayores de 18 años. Los menores de edad solo podrán utilizarlo con la autorización y bajo la supervisión de sus padres, madres, tutores o representantes legales.",
            "El usuario debe notificar de inmediato al Titular ante cualquier uso no autorizado de su cuenta.",
          ]}
        />
      </LegalSection>

      <LegalSection n={6} title="Planes: Gratuito y Pro">
        <p>
          El Servicio se ofrece bajo un modelo <em>freemium</em>. El plan
          gratuito permite generar planes de horarios con filtros básicos y un
          límite de resultados por generación. El plan{" "}
          <strong>Pro</strong> (pago) desbloquea funcionalidades adicionales,
          entre ellas: filtros avanzados (franjas horarias, sedes, límites de
          días y horas, bache máximo), la posibilidad de fijar cátedras o
          docentes específicos, guardar planes favoritos, un límite ampliado de
          resultados por generación y el acceso completo a las reseñas de la
          comunidad.
        </p>
        <p>
          El alcance concreto de cada plan es el que se informa dentro de la
          Plataforma al momento de la contratación, y podrá ser modificado
          conforme la sección de modificaciones de estos Términos.
        </p>
      </LegalSection>

      <LegalSection n={7} title="Suscripción Pro, precios y pagos">
        <LegalList
          items={[
            <>
              <strong>Precio.</strong> El precio del plan Pro es el que se
              informa de manera clara dentro de la Plataforma al momento de
              iniciar la compra, expresado en pesos argentinos (ARS) e impuestos
              incluidos cuando correspondan.
            </>,
            <>
              <strong>Duración.</strong> La contratación del plan Pro otorga
              acceso a las funcionalidades premium por un período de tres (3)
              meses (noventa días corridos) contados desde la acreditación del
              pago.
            </>,
            <>
              <strong>Pago único, sin renovación automática.</strong> Se trata
              de un pago único. No es una suscripción de débito recurrente: no se
              realizarán cobros automáticos y el acceso premium finaliza al
              vencimiento del período contratado, salvo que el usuario decida
              contratar nuevamente.
            </>,
            <>
              <strong>Acumulación.</strong> Si el usuario contrata un nuevo
              período mientras aún posee un período vigente, el nuevo plazo se
              adiciona a partir de la fecha de vencimiento del período en curso.
            </>,
            <>
              <strong>Medio de pago.</strong> Los pagos se procesan a través de
              Mercado Pago. El Titular no accede ni almacena los datos completos
              de la tarjeta o del medio de pago utilizado; dicha información es
              tratada exclusivamente por Mercado Pago conforme a sus propios
              términos y políticas.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection n={8} title="Derecho de revocación (arrepentimiento)">
        <p>
          De conformidad con el artículo 34 de la Ley N° 24.240 de Defensa del
          Consumidor y la Resolución N° 424/2020 de la Secretaría de Comercio
          Interior, el consumidor tiene derecho a revocar la contratación
          dentro de los <strong>diez (10) días corridos</strong> contados a
          partir de la contratación del Servicio, sin necesidad de expresar
          causa y sin penalidad alguna.
        </p>
        <p>
          Para ejercer este derecho, el usuario puede utilizar el{" "}
          <Link to="/arrepentimiento" className={linkClass}>
            Botón de arrepentimiento
          </Link>
          , disponible de forma permanente en la Plataforma.
        </p>
      </LegalSection>

      <LegalSection n={9} title="Reembolsos y cancelaciones">
        <p>
          Ejercido válidamente el derecho de revocación dentro del plazo legal,
          el Titular reintegrará las sumas abonadas a través del mismo medio de
          pago utilizado, sin cargo para el usuario. El reintegro se gestionará
          mediante Mercado Pago dentro de los plazos que dicha plataforma
          establezca para la operatoria. Los reclamos por pagos no acreditados,
          duplicados o erróneos podrán canalizarse al correo de contacto
          indicado en estos Términos.
        </p>
      </LegalSection>

      <LegalSection n={10} title="Uso aceptable y conductas prohibidas">
        <p>El usuario se obliga a no:</p>
        <LegalList
          items={[
            "Utilizar el Servicio con fines ilícitos o contrarios a la buena fe, la moral o el orden público.",
            "Acceder, extraer o replicar de forma masiva o automatizada los contenidos de la Plataforma (scraping, crawling u otras técnicas) sin autorización expresa.",
            "Revender, sublicenciar, ceder o explotar comercialmente el Servicio o el acceso a él.",
            "Intentar vulnerar la seguridad, integridad o disponibilidad de la Plataforma, ni acceder a cuentas o datos de terceros.",
            "Publicar en las reseñas contenido difamatorio, discriminatorio, injurioso, falso o que infrinja derechos de terceros.",
          ]}
        />
        <p>
          El incumplimiento de estas obligaciones podrá dar lugar a la
          suspensión o cancelación de la cuenta, sin perjuicio de las acciones
          legales que pudieran corresponder.
        </p>
      </LegalSection>

      <LegalSection n={11} title="Contenido generado por usuarios (reseñas)">
        <p>
          La Plataforma puede permitir a los usuarios publicar reseñas y
          valoraciones sobre cátedras y docentes. El usuario es el único
          responsable del contenido que publica y garantiza que este es veraz,
          propio y no infringe derechos de terceros. Las reseñas se muestran de
          forma anónima frente a otros usuarios.
        </p>
        <p>
          Al publicar contenido, el usuario otorga al Titular una licencia
          gratuita, no exclusiva y sin límite territorial para almacenar,
          reproducir y exhibir dicho contenido dentro del Servicio. El Titular
          podrá moderar, editar o remover reseñas que resulten inapropiadas o
          contrarias a estos Términos, sin que ello genere derecho a
          indemnización alguna.
        </p>
      </LegalSection>

      <LegalSection n={12} title="Propiedad intelectual">
        <p>
          La marca &ldquo;Planify&rdquo;, el logotipo, el diseño, el código
          fuente, la interfaz y demás elementos de la Plataforma son de
          titularidad del Titular o de sus licenciantes, y se encuentran
          protegidos por la normativa vigente en materia de propiedad
          intelectual. Queda prohibida su reproducción, distribución o
          transformación sin autorización previa y por escrito.
        </p>
      </LegalSection>

      <LegalSection n={13} title="Limitación de responsabilidad">
        <p>
          El Servicio se ofrece &ldquo;tal cual&rdquo; y &ldquo;según
          disponibilidad&rdquo;. El Titular no garantiza que el Servicio
          funcione de manera ininterrumpida o libre de errores, ni que los
          resultados obtenidos sean exactos o adecuados para un fin
          determinado.
        </p>
        <p>
          En la máxima medida permitida por la legislación aplicable, y sin
          afectar los derechos que las normas de defensa del consumidor
          reconocen de manera imperativa al usuario, el Titular no será
          responsable por daños indirectos, incidentales o consecuentes
          derivados del uso o de la imposibilidad de uso de la Plataforma, ni
          por decisiones tomadas sobre la base de la información allí provista.
        </p>
      </LegalSection>

      <LegalSection n={14} title="Disponibilidad y modificaciones">
        <p>
          El Titular podrá modificar, suspender o discontinuar, total o
          parcialmente, el Servicio o cualquiera de sus funcionalidades. Asimismo,
          podrá actualizar estos Términos en cualquier momento. Los cambios
          entrarán en vigencia desde su publicación en esta página, indicándose
          la fecha de última actualización. El uso continuado del Servicio con
          posterioridad a la publicación de los cambios implica su aceptación.
        </p>
      </LegalSection>

      <LegalSection n={15} title="Protección de datos personales">
        <p>
          El tratamiento de los datos personales de los usuarios se rige por
          nuestra{" "}
          <Link to="/privacidad" className={linkClass}>
            Política de Privacidad
          </Link>
          , que forma parte integrante de estos Términos.
        </p>
      </LegalSection>

      <LegalSection n={16} title="Ley aplicable y jurisdicción">
        <p>
          Estos Términos se rigen por las leyes de la República Argentina. Para
          toda controversia derivada del uso del Servicio, cuando el usuario
          revista el carácter de consumidor o usuario en los términos de la Ley
          N° 24.240, resultarán competentes los tribunales correspondientes a su
          domicilio, conforme lo establece dicha normativa.
        </p>
        <p>
          La autoridad de aplicación en materia de defensa del consumidor recibe
          consultas y denuncias; asimismo, el usuario puede iniciar un reclamo a
          través de la Ventanilla Única Federal de Defensa del Consumidor{" "}
          <a
            href="https://autogestion.produccion.gob.ar/consumidores"
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            (autogestion.produccion.gob.ar/consumidores)
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection n={17} title="Contacto">
        <p>
          Ante cualquier consulta relacionada con estos Términos, puede
          comunicarse a{" "}
          <a href={`mailto:${RESPONSABLE.emailSoporte}`} className={linkClass}>
            {RESPONSABLE.emailSoporte}
          </a>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
