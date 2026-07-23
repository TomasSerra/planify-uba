import { Link } from "react-router-dom";
import {
  LegalLayout,
  LegalSection,
  LegalList,
  RESPONSABLE,
} from "@/components/LegalLayout";

const LAST_UPDATED = "23 de julio de 2026";

const linkClass = "font-medium text-primary underline-offset-4 hover:underline";

export function Privacidad() {
  return (
    <LegalLayout
      title="Política de Privacidad"
      description="Política de Privacidad de Planify: qué datos personales tratamos, con qué finalidad, con quién los compartimos y cómo ejercer tus derechos."
      path="/privacidad"
      lastUpdated={LAST_UPDATED}
    >
      <p className="text-sm leading-relaxed text-muted-foreground">
        La presente Política de Privacidad describe cómo se recopilan, utilizan,
        almacenan y protegen los datos personales de los usuarios de{" "}
        <strong>Planify</strong> (en adelante, el{" "}
        <strong>&ldquo;Servicio&rdquo;</strong>), en cumplimiento de la Ley N°
        25.326 de Protección de los Datos Personales y su normativa
        reglamentaria y complementaria.
      </p>

      <LegalSection n={1} title="Responsable del tratamiento">
        <p>
          El responsable del tratamiento de los datos personales es{" "}
          <strong>{RESPONSABLE.nombre}</strong>, CUIT {RESPONSABLE.cuit}, con
          domicilio en {RESPONSABLE.domicilio}. Para cualquier cuestión
          vinculada a la privacidad y al tratamiento de datos, puede
          contactarse a{" "}
          <a href={`mailto:${RESPONSABLE.emailLegal}`} className={linkClass}>
            {RESPONSABLE.emailLegal}
          </a>{" "}
          o a{" "}
          <a href={`mailto:${RESPONSABLE.emailSoporte}`} className={linkClass}>
            {RESPONSABLE.emailSoporte}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection n={2} title="Marco legal">
        <p>
          El tratamiento de los datos personales se realiza conforme a la Ley N°
          25.326, siendo la Agencia de Acceso a la Información Pública (AAIP) el
          órgano de control competente en la materia.
        </p>
      </LegalSection>

      <LegalSection n={3} title="Datos que recopilamos">
        <p>Según el uso que se haga del Servicio, podemos tratar:</p>
        <LegalList
          items={[
            <>
              <strong>Datos de cuenta.</strong> Dirección de correo electrónico
              y credenciales de acceso, gestionadas a través de Firebase
              Authentication. Si el usuario inicia sesión con Google, podemos
              recibir además su nombre y su imagen de perfil provistos por dicha
              cuenta.
            </>,
            <>
              <strong>Datos de perfil.</strong> La carrera seleccionada y el
              nombre que el usuario decida ingresar dentro de la Plataforma.
            </>,
            <>
              <strong>Datos de la transacción.</strong> En caso de contratar el
              plan Pro, información asociada al pago (identificador de la
              operación, montos y comisiones). Los datos completos de la tarjeta
              o medio de pago <strong>no</strong> son tratados ni almacenados por
              el Servicio: los procesa directamente Mercado Pago.
            </>,
            <>
              <strong>Contenido del usuario.</strong> Los planes que el usuario
              guarde como favoritos y las reseñas y valoraciones que publique
              (calificación y comentario), las cuales se muestran de forma
              anónima frente a otros usuarios.
            </>,
            <>
              <strong>Datos técnicos y de almacenamiento local.</strong> Para el
              funcionamiento de la aplicación se utiliza almacenamiento local del
              navegador (localStorage e IndexedDB), por ejemplo para conservar la
              sesión iniciada y el historial de planes generados en el
              dispositivo.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection n={4} title="Finalidades del tratamiento">
        <p>Los datos se utilizan para:</p>
        <LegalList
          items={[
            "Permitir el registro, la autenticación y el acceso a la cuenta.",
            "Prestar el Servicio y personalizar la experiencia según la carrera y las preferencias del usuario.",
            "Procesar y gestionar la contratación del plan Pro y sus eventuales reintegros.",
            "Habilitar el guardado de planes favoritos y la publicación de reseñas.",
            "Brindar soporte, responder consultas y comunicar cuestiones relativas al Servicio.",
            "Cumplir con obligaciones legales y prevenir usos indebidos o fraudulentos.",
          ]}
        />
      </LegalSection>

      <LegalSection n={5} title="Encargados y transferencias internacionales">
        <p>
          Para prestar el Servicio recurrimos a proveedores que actúan como
          encargados del tratamiento y que pueden almacenar y procesar datos en
          servidores ubicados fuera de la República Argentina:
        </p>
        <LegalList
          items={[
            <>
              <strong>Google / Firebase</strong> (autenticación de usuarios).
            </>,
            <>
              <strong>Mercado Pago</strong> (procesamiento de pagos).
            </>,
            <>
              <strong>Vercel</strong> (alojamiento del sitio y de la API).
            </>,
            <>
              <strong>Neon</strong> (base de datos).
            </>,
            <>
              <strong>Google Fonts</strong> (provisión de tipografías, que puede
              implicar la transmisión de la dirección IP del visitante a Google).
            </>,
          ]}
        />
        <p>
          Al utilizar el Servicio, el usuario presta su consentimiento para la
          transferencia internacional de sus datos a dichos proveedores, con la
          exclusiva finalidad de prestar el Servicio.
        </p>
      </LegalSection>

      <LegalSection n={6} title="Conservación y seguridad">
        <p>
          Los datos se conservan mientras la cuenta permanezca activa y durante
          el tiempo necesario para cumplir con las finalidades descriptas y con
          las obligaciones legales aplicables. Adoptamos medidas técnicas y
          organizativas razonables para proteger los datos personales contra su
          adulteración, pérdida, consulta o tratamiento no autorizado.
        </p>
      </LegalSection>

      <LegalSection n={7} title="Derechos del titular de los datos">
        <p>
          El titular de los datos tiene derecho a acceder, rectificar,
          actualizar y suprimir sus datos personales. Para ejercer estos
          derechos, puede enviar una solicitud a{" "}
          <a href={`mailto:${RESPONSABLE.emailLegal}`} className={linkClass}>
            {RESPONSABLE.emailLegal}
          </a>
          . También es posible eliminar la cuenta y los datos asociados
          solicitándolo por dicha vía.
        </p>
        <p className="rounded-md border border-border bg-muted/40 p-4 text-xs">
          El titular de los datos personales tiene la facultad de ejercer el
          derecho de acceso a los mismos en forma gratuita a intervalos no
          inferiores a seis meses, salvo que se acredite un interés legítimo al
          efecto conforme lo establecido en el artículo 14, inciso 3 de la Ley
          N° 25.326.
        </p>
        <p className="rounded-md border border-border bg-muted/40 p-4 text-xs">
          La AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, Órgano de Control de la
          Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos
          que se interpongan con relación al incumplimiento de las normas sobre
          protección de datos personales.
        </p>
      </LegalSection>

      <LegalSection n={8} title="Datos de menores">
        <p>
          El Servicio está dirigido a personas mayores de edad. No recopilamos
          de forma intencional datos de menores sin la debida autorización de
          sus representantes legales. Si tomamos conocimiento de un tratamiento
          de este tipo sin autorización, procederemos a eliminar la información
          correspondiente.
        </p>
      </LegalSection>

      <LegalSection n={9} title="Cookies y tecnologías de seguimiento">
        <p>
          El Servicio <strong>no utiliza cookies de seguimiento publicitario ni
          herramientas de analítica o rastreo de terceros</strong>. Únicamente se
          emplea almacenamiento local del navegador con fines funcionales, como
          mantener la sesión iniciada y recordar el historial de planes generados
          en el dispositivo.
        </p>
      </LegalSection>

      <LegalSection n={10} title="Cambios en esta Política">
        <p>
          Podemos actualizar esta Política de Privacidad para reflejar cambios en
          el Servicio o en la normativa aplicable. La versión vigente será
          siempre la publicada en esta página, con indicación de su fecha de
          última actualización.
        </p>
      </LegalSection>

      <LegalSection n={11} title="Contacto">
        <p>
          Ante cualquier consulta sobre esta Política o sobre el tratamiento de
          sus datos, puede escribirnos a{" "}
          <a href={`mailto:${RESPONSABLE.emailLegal}`} className={linkClass}>
            {RESPONSABLE.emailLegal}
          </a>
          . Consulte también nuestros{" "}
          <Link to="/terminos" className={linkClass}>
            Términos y Condiciones
          </Link>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
