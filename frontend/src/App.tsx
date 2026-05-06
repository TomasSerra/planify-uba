import { Routes, Route } from "react-router-dom";
import { Home } from "./pages/Home";
import { PagoExitoso } from "./pages/PagoExitoso";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/pago-exitoso" element={<PagoExitoso />} />
    </Routes>
  );
}
