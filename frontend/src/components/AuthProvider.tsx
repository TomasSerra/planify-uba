import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  AuthContext,
  type AuthContextValue,
  type AuthTab,
  type AuthUser,
} from "@/lib/authContext";
import { AuthDialog } from "./AuthDialog";

function mapUser(u: import("firebase/auth").User | null): AuthUser | null {
  if (!u) return null;
  return {
    uid: u.uid,
    email: u.email,
    photoURL: u.photoURL,
    displayName: u.displayName,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginTab, setLoginTab] = useState<AuthTab>("signin");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      setUser(mapUser(fbUser));
      setIsLoading(false);
    });
    return unsub;
  }, []);

  const getAccessTokenSilently = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) throw new Error("No hay usuario autenticado");
    return current.getIdToken();
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const openLogin = useCallback((tab: AuthTab = "signin") => {
    setLoginTab(tab);
    setLoginOpen(true);
  }, []);

  // Cerrar el modal apenas haya sesión activa.
  useEffect(() => {
    if (user && loginOpen) setLoginOpen(false);
  }, [user, loginOpen]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      getAccessTokenSilently,
      logout,
      openLogin,
    }),
    [user, isLoading, getAccessTokenSilently, logout, openLogin]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AuthDialog
        open={loginOpen}
        initialTab={loginTab}
        onOpenChange={setLoginOpen}
      />
    </AuthContext.Provider>
  );
}
