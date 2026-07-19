import { useEffect, useState } from "react";
import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  updateProfile as updateFirebaseProfile,
} from "firebase/auth";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import googleLogo from "@/assets/google-logo.png";
import { auth, googleProvider } from "@/lib/firebase";
import { api } from "@/lib/api";
import { useAlert } from "@/lib/alert";
import type { AuthTab } from "@/lib/authContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function mapFirebaseError(code: string): string {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email o contraseña incorrectos.";
    case "auth/invalid-email":
      return "El email no es válido.";
    case "auth/email-already-in-use":
      return "Ya existe una cuenta con ese email.";
    case "auth/weak-password":
      return "La contraseña debe tener al menos 6 caracteres.";
    case "auth/network-request-failed":
      return "Sin conexión. Revisá tu internet e intentá de nuevo.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Probá de nuevo en unos minutos.";
    case "auth/popup-blocked":
      return "El popup fue bloqueado. Intentá de nuevo.";
    default:
      return "Ocurrió un error. Intentá de nuevo.";
  }
}

export function AuthDialog({
  open,
  initialTab,
  onOpenChange,
}: {
  open: boolean;
  initialTab: AuthTab;
  onOpenChange: (v: boolean) => void;
}) {
  const showAlert = useAlert();
  const [tab, setTab] = useState<AuthTab>(initialTab);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"email" | "google" | null>(null);

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      setError(null);
    } else {
      setNombre("");
      setEmail("");
      setPassword("");
      setPasswordConfirm("");
      setError(null);
      setBusy(null);
    }
  }, [open, initialTab]);

  useEffect(() => {
    setError(null);
  }, [tab]);

  async function handleGoogle() {
    setBusy("google");
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      if (e instanceof FirebaseError) {
        if (e.code === "auth/popup-closed-by-user" || e.code === "auth/cancelled-popup-request") {
          setBusy(null);
          return;
        }
        if (e.code === "auth/popup-blocked") {
          try {
            await signInWithRedirect(auth, googleProvider);
            return;
          } catch (redirectErr) {
            const code = redirectErr instanceof FirebaseError ? redirectErr.code : "";
            setError(mapFirebaseError(code));
          }
        } else {
          setError(mapFirebaseError(e.code));
        }
      } else {
        setError(mapFirebaseError(""));
      }
    } finally {
      setBusy(null);
    }
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy("email");
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      const code = err instanceof FirebaseError ? err.code : "";
      setError(mapFirebaseError(code));
    } finally {
      setBusy(null);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (password !== passwordConfirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    const nombreLimpio = nombre.trim();
    setBusy("email");
    setError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      // Guardamos el nombre en Firebase (displayName) y en nuestra DB. Si el
      // PATCH falla, el modal forzado de CareerProvider queda como red de
      // seguridad (displayName seteado → auto-persistencia lo reintenta).
      await updateFirebaseProfile(cred.user, { displayName: nombreLimpio }).catch(
        () => {}
      );
      cred.user
        .getIdToken()
        .then((token) => api.updateProfile({ nombre: nombreLimpio }, token))
        .catch(() => {});
      sendEmailVerification(cred.user).catch(() => {
        /* no bloqueante: la app no exige verificación */
      });
    } catch (err) {
      const code = err instanceof FirebaseError ? err.code : "";
      setError(mapFirebaseError(code));
    } finally {
      setBusy(null);
    }
  }

  async function handleReset() {
    if (!email.trim()) {
      setError("Ingresá tu email arriba primero.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      showAlert({
        variant: "info",
        title: "Email enviado",
        message: `Te enviamos un mail a ${email.trim()} con instrucciones para resetear tu contraseña.`,
      });
    } catch (err) {
      const code = err instanceof FirebaseError ? err.code : "";
      setError(mapFirebaseError(code));
    }
  }

  const isSignIn = tab === "signin";
  const submitting = busy === "email";
  const googling = busy === "google";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isSignIn ? <LogIn className="size-5 text-primary" /> : <UserPlus className="size-5 text-primary" />}
            {isSignIn ? "Iniciar sesión" : "Crear cuenta"}
          </DialogTitle>
          <DialogDescription>
            {isSignIn
              ? "Entrá con tu email o cuenta de Google."
              : "Creá una cuenta para guardar planes y suscribirte a Pro."}
          </DialogDescription>
        </DialogHeader>

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full"
          onClick={handleGoogle}
          disabled={busy !== null}
        >
          {googling ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <img src={googleLogo} alt="" className="size-4" />
          )}
          Continuar con Google
        </Button>

        <div className="my-1 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">O</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form
          onSubmit={isSignIn ? handleSignIn : handleSignUp}
          className="space-y-3"
        >
          {!isSignIn && (
            <div className="space-y-1.5">
              <Label htmlFor="auth-nombre">Nombre completo</Label>
              <Input
                id="auth-nombre"
                type="text"
                autoComplete="name"
                required
                maxLength={100}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                disabled={busy !== null}
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="auth-email">Email</Label>
            <Input
              id="auth-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy !== null}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="auth-password">Contraseña</Label>
            <Input
              id="auth-password"
              type="password"
              autoComplete={isSignIn ? "current-password" : "new-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy !== null}
            />
          </div>
          {!isSignIn && (
            <div className="space-y-1.5">
              <Label htmlFor="auth-password-confirm">Confirmar contraseña</Label>
              <Input
                id="auth-password-confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                disabled={busy !== null}
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={busy !== null}
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : isSignIn ? (
              <LogIn className="size-4" />
            ) : (
              <UserPlus className="size-4" />
            )}
            {isSignIn ? "Iniciar sesión" : "Crear cuenta"}
          </Button>

          {isSignIn && (
            <button
              type="button"
              onClick={handleReset}
              className="block w-full text-center text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </button>
          )}
        </form>

        <div className="pt-1 text-center text-sm text-muted-foreground">
          {isSignIn ? (
            <>
              ¿No tenés cuenta?{" "}
              <button
                type="button"
                onClick={() => setTab("signup")}
                className="font-medium text-primary hover:underline"
              >
                Crear una
              </button>
            </>
          ) : (
            <>
              ¿Ya tenés cuenta?{" "}
              <button
                type="button"
                onClick={() => setTab("signin")}
                className="font-medium text-primary hover:underline"
              >
                Iniciar sesión
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
