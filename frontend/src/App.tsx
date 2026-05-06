import { Routes, Route } from "react-router-dom";
import { Home } from "./pages/Home";
import { Favoritos } from "./pages/Favoritos";
import { PaywallProvider } from "./components/PaywallProvider";

export default function App() {
  return (
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
  );
}
