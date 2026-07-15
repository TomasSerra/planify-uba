import { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorState } from "@/components/ErrorState";
import { reportError } from "@/lib/reportError";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

// Atrapa cualquier throw durante el render del árbol y evita la pantalla en
// blanco. Reporta el error al backend y muestra <ErrorState> (sin exponer el
// mensaje crudo). "Reintentar" recarga la app.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    reportError({
      kind: "render",
      message: error.message,
      name: error.name,
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center p-4">
          <ErrorState onRetry={() => window.location.reload()} />
        </div>
      );
    }
    return this.props.children;
  }
}
