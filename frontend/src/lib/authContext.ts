import { createContext } from "react";

export type AuthUser = {
  uid: string;
  email: string | null;
  photoURL: string | null;
  displayName: string | null;
  // "google.com" | "password" | ... — provider con el que se autenticó.
  providerId: string | null;
};

export type AuthTab = "signin" | "signup";

export type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  getAccessTokenSilently: () => Promise<string>;
  logout: (opts?: unknown) => Promise<void>;
  openLogin: (tab?: AuthTab) => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
