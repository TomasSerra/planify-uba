import { Routes, Route } from "react-router-dom";
import { Home } from "./pages/Home";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      {/* MP redirige acá tras éxito o falla. Home detecta la ruta, abre el
          dialog correspondiente, y limpia la URL a "/". */}
      <Route path="/pago-exitoso" element={<Home />} />
      <Route path="/pago-error" element={<Home />} />
    </Routes>
  );
}
