import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Home } from "./pages/Home";
import { Favoritos } from "./pages/Favoritos";
import { PlanesEstudio } from "./pages/PlanesEstudio";
import { Catedras } from "./pages/Catedras";
import { CatedraReviews } from "./pages/CatedraReviews";
import { Terminos } from "./pages/Terminos";
import { Privacidad } from "./pages/Privacidad";
import { Arrepentimiento } from "./pages/Arrepentimiento";
import { PaywallProvider } from "./components/PaywallProvider";
import { CareerProvider } from "./components/CareerProvider";
import { Footer } from "./components/Footer";

// Resetea el scroll al tope en cada cambio de ruta: React Router conserva la
// posición por defecto (ej: entrar a una cátedra desde /recomendaciones).
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <PaywallProvider>
      <CareerProvider>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/favoritos" element={<Favoritos />} />
          <Route path="/planes-estudio" element={<PlanesEstudio />} />
          <Route path="/recomendaciones" element={<Catedras />} />
          <Route path="/catedras" element={<Navigate to="/recomendaciones" replace />} />
          <Route path="/catedras/:catedraId" element={<CatedraReviews />} />
          <Route path="/terminos" element={<Terminos />} />
          <Route path="/privacidad" element={<Privacidad />} />
          <Route path="/arrepentimiento" element={<Arrepentimiento />} />
          {/* MP redirige acá tras éxito o falla. Home detecta la ruta, abre el
              dialog correspondiente, y limpia la URL a "/". */}
          <Route path="/pago-exitoso" element={<Home />} />
          <Route path="/pago-error" element={<Home />} />
        </Routes>
        <Footer />
      </CareerProvider>
    </PaywallProvider>
  );
}
