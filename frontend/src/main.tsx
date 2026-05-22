import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AlertProvider } from "./lib/alert";
import { AuthProvider } from "./components/AuthProvider";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      // Evita re-fetchear al volver de otra pestaña del navegador. Para `["me"]`
      // además usamos staleTime: Infinity localmente — el único refresh ocurre
      // vía mutations (cambio de carrera, pago acreditado).
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AlertProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </AlertProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
