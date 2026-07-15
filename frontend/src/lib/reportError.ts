import { API_BASE } from "./api";

type ErrorKind = "render" | "onerror" | "unhandledrejection" | "api";

interface ReportInput {
  kind: ErrorKind;
  message: string;
  name?: string | null;
  stack?: string | null;
  componentStack?: string | null;
}

// Dedupe: si un error se dispara en loop (típico en un render que tira), no
// inundamos los logs. Recordamos fingerprints recientes por una ventana corta.
const seen = new Map<string, number>();
const DEDUPE_MS = 10_000;

function shouldSkip(fingerprint: string): boolean {
  const now = Date.now();
  for (const [fp, ts] of seen) {
    if (now - ts > DEDUPE_MS) seen.delete(fp);
  }
  if (seen.has(fingerprint)) return true;
  seen.set(fingerprint, now);
  return false;
}

// Fire-and-forget: reporta un error del navegador al backend, que lo loguea en
// los Runtime Logs de Vercel. Nunca tira (un error acá crearía un loop).
export function reportError(input: ReportInput): void {
  try {
    const fingerprint = `${input.name ?? ""}|${input.message}|${
      input.stack?.split("\n")[1] ?? ""
    }`;
    if (shouldSkip(fingerprint)) return;

    const body = JSON.stringify({
      kind: input.kind,
      message: input.message,
      name: input.name ?? null,
      stack: input.stack ?? null,
      component_stack: input.componentStack ?? null,
      url: window.location.pathname + window.location.search,
      user_agent: navigator.userAgent,
    });

    fetch(`${API_BASE}/client-errors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      /* el reporte es best-effort: si falla, no hacemos nada */
    });
  } catch {
    /* jamás propagar desde el reporter */
  }
}
