import { Routes, Route } from "react-router-dom";
import { Home } from "./pages/Home";
import { Favoritos } from "./pages/Favoritos";
import { PlanesEstudio } from "./pages/PlanesEstudio";
import { Catedras } from "./pages/Catedras";
import { CatedraReviews } from "./pages/CatedraReviews";
import { PaywallProvider } from "./components/PaywallProvider";
import { CareerProvider } from "./components/CareerProvider";
import { Footer } from "./components/Footer";

export default function App() {
  return (
    <PaywallProvider>
      <CareerProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/favoritos" element={<Favoritos />} />
          <Route path="/planes-estudio" element={<PlanesEstudio />} />
          <Route path="/catedras" element={<Catedras />} />
          <Route path="/catedras/:catedraId" element={<CatedraReviews />} />
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
