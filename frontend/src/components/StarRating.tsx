import * as React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

// Estrella de sólo lectura con relleno fraccionario (0..1): una estrella vacía
// de fondo y una llena recortada por ancho, así el promedio (ej 4.3) se ve preciso
// sin depender del gap entre estrellas.
function DisplayStar({ fill, size }: { fill: number; size: number }) {
  const dim = { width: size, height: size };
  return (
    <span
      className="relative inline-block shrink-0"
      style={dim}
      aria-hidden="true"
    >
      <Star
        className="absolute inset-0 fill-transparent text-muted-foreground/30"
        style={dim}
        strokeWidth={1.5}
      />
      <span
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${Math.min(1, Math.max(0, fill)) * 100}%` }}
      >
        <Star
          className="fill-amber-400 text-amber-400"
          style={dim}
          strokeWidth={1.5}
        />
      </span>
    </span>
  );
}

function InteractiveStars({
  value,
  onChange,
  size,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  size: number;
  disabled?: boolean;
}) {
  const [hover, setHover] = React.useState<number | null>(null);
  const shown = hover ?? value;
  return (
    <div
      className="flex items-center gap-1"
      onMouseLeave={() => setHover(null)}
      role="radiogroup"
      aria-label="Puntuación en estrellas"
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"}`}
          onClick={() => onChange(n)}
          onMouseEnter={() => !disabled && setHover(n)}
          className="rounded p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          <Star
            style={{ width: size, height: size }}
            className={cn(
              "transition-colors",
              n <= shown
                ? "fill-amber-400 text-amber-400"
                : "fill-transparent text-muted-foreground/40"
            )}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  );
}

export function StarRating({
  value,
  size = 16,
  interactive = false,
  onChange,
  disabled,
  className,
}: {
  value: number;
  size?: number;
  interactive?: boolean;
  onChange?: (v: number) => void;
  disabled?: boolean;
  className?: string;
}) {
  if (interactive) {
    return (
      <InteractiveStars
        value={value}
        onChange={onChange ?? (() => {})}
        size={size}
        disabled={disabled}
      />
    );
  }
  return (
    <div
      className={cn("flex items-center", className)}
      style={{ gap: Math.max(1, size * 0.1) }}
      aria-label={`${value.toFixed(1)} de 5 estrellas`}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <DisplayStar key={i} fill={value - i} size={size} />
      ))}
    </div>
  );
}
