import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AlertProvider } from "./lib/alert";
import { AuthProvider } from "./components/AuthProvider";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { reportError } from "./lib/reportError";
import "./index.css";

// Captura global de errores JS sueltos y promesas sin `.catch` → los reporta al
// backend (Vercel Logs). El ErrorBoundary de abajo cubre los throws de render.
window.addEventListener("error", (e) => {
  reportError({
    kind: "onerror",
    message: e.message,
    name: e.error?.name,
    stack: e.error?.stack,
  });
});
window.addEventListener("unhandledrejection", (e) => {
  const reason = e.reason;
  reportError({
    kind: "unhandledrejection",
    message: String(reason?.message ?? reason),
    name: reason?.name,
    stack: reason?.stack,
  });
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // El reintento automático vive en `request()` (lib/api.ts): un solo
      // reintento para queries y fetches manuales por igual.
      retry: false,
      // Evita re-fetchear al volver de otra pestaña del navegador. Para `["me"]`
      // además usamos staleTime: Infinity localmente — el único refresh ocurre
      // vía mutations (cambio de carrera, pago acreditado).
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AlertProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </AlertProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
