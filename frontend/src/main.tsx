import React from "react";
import ReactDOM from "react-dom/client";
import { Auth0Provider } from "@auth0/auth0-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AlertProvider } from "./lib/alert";
import "./index.css";

// Workaround para Arc (y cualquier browser que abra el redirect de
// loginWithRedirect en una tab nueva). El SDK de Auth0 guarda el state token
// de la transacción en sessionStorage, que NO se comparte entre tabs. Si la
// tab original arranca el login y la tab nueva recibe el callback, el SDK
// no encuentra el state y la validación falla silenciosamente. Espejamos
// las keys de transacción a localStorage (que sí se comparte entre tabs) y
// las restauramos al sessionStorage de la tab nueva si están faltando.
if (typeof window !== "undefined") {
  const TX_PREFIX = "a0.spajs.txs";
  const _set = sessionStorage.setItem.bind(sessionStorage);
  const _get = sessionStorage.getItem.bind(sessionStorage);
  const _remove = sessionStorage.removeItem.bind(sessionStorage);

  sessionStorage.setItem = (key, value) => {
    _set(key, value);
    if (key.startsWith(TX_PREFIX)) {
      try {
        localStorage.setItem(key, value);
      } catch {
        /* quota / privacy mode */
      }
    }
  };

  sessionStorage.getItem = (key) => {
    let val = _get(key);
    if (val == null && key.startsWith(TX_PREFIX)) {
      try {
        const fromLocal = localStorage.getItem(key);
        if (fromLocal != null) {
          _set(key, fromLocal);
          val = fromLocal;
        }
      } catch {
        /* ignore */
      }
    }
    return val;
  };

  sessionStorage.removeItem = (key) => {
    _remove(key);
    if (key.startsWith(TX_PREFIX)) {
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    }
  };
}

const AUTH0_DOMAIN = import.meta.env.VITE_AUTH0_DOMAIN;
const AUTH0_CLIENT_ID = import.meta.env.VITE_AUTH0_CLIENT_ID;
const AUTH0_AUDIENCE = import.meta.env.VITE_AUTH0_AUDIENCE;
if (!AUTH0_DOMAIN || !AUTH0_CLIENT_ID || !AUTH0_AUDIENCE) {
  throw new Error(
    "Faltan VITE_AUTH0_DOMAIN, VITE_AUTH0_CLIENT_ID o VITE_AUTH0_AUDIENCE"
  );
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Auth0Provider
      domain={AUTH0_DOMAIN}
      clientId={AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: AUTH0_AUDIENCE,
        scope: "openid profile email offline_access",
      }}
      cacheLocation="localstorage"
      useRefreshTokens
    >
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AlertProvider>
            <App />
          </AlertProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </Auth0Provider>
  </React.StrictMode>
);
