import { useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { Routes, Route } from "react-router-dom";
import { Home } from "./pages/Home";
import { Favoritos } from "./pages/Favoritos";
import { PaywallProvider } from "./components/PaywallProvider";

// Al montar (o al volver de un login), si Auth0 dice que estamos autenticados
// pero el refresh token venció / desapareció, getAccessTokenSilently va a
// fallar. En ese caso limpiamos la sesión local (openUrl: false → no redirige
// a Auth0) para que la UI muestre al usuario como deslogueado sin tener que
// esperar a la próxima acción que requiera token.
function SessionValidator() {
  const { isAuthenticated, isLoading, getAccessTokenSilently, logout } =
    useAuth0();

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    let cancelled = false;
    (async () => {
      try {
        await getAccessTokenSilently();
      } catch {
        if (cancelled) return;
        logout({ openUrl: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoading, getAccessTokenSilently, logout]);

  return null;
}

export default function App() {
  return (
    <>
      <SessionValidator />
      <PaywallProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/favoritos" element={<Favoritos />} />
          {/* MP redirige acá tras éxito o falla. Home detecta la ruta, abre el
              dialog correspondiente, y limpia la URL a "/". */}
          <Route path="/pago-exitoso" element={<Home />} />
          <Route path="/pago-error" element={<Home />} />
        </Routes>
      </PaywallProvider>
    </>
  );
}
