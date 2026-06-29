import { Headset, Instagram, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

export function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.83a8.16 8.16 0 0 0 4.77 1.52V6.9a4.85 4.85 0 0 1-1.84-.21z" />
    </svg>
  );
}

export function ContactLinks({
  orientation = "row",
}: {
  orientation?: "row" | "col";
}) {
  const vertical = orientation === "col";
  return (
    <div
      className={cn(
        "flex text-xs text-muted-foreground",
        vertical ? "flex-col gap-4" : "flex-col items-center gap-3 sm:flex-row sm:justify-between"
      )}
    >
      <div className={cn("flex", vertical ? "flex-col gap-3" : "items-center gap-4")}>
        <a
          href="mailto:planify.uni@gmail.com"
          className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
        >
          <Mail className="size-4" />
          planify.uni@gmail.com
        </a>
        <a
          href="mailto:planify.uni@gmail.com"
          className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
        >
          <Headset className="size-4" />
          Ayuda
        </a>
      </div>
      <div className="flex items-center gap-4">
        <a
          href="https://www.instagram.com/planify.uni/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram"
          title="Instagram"
          className="transition-colors hover:text-foreground"
        >
          <Instagram className="size-4" />
        </a>
        <a
          href="https://www.tiktok.com/@planify.uni"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="TikTok"
          title="TikTok"
          className="transition-colors hover:text-foreground"
        >
          <TikTokIcon className="size-4" />
        </a>
      </div>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="hidden border-t border-border bg-card sm:block">
      <div className="container py-4">
        <ContactLinks orientation="row" />
      </div>
    </footer>
  );
}
