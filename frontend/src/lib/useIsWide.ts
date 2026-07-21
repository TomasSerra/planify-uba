import { useEffect, useState } from "react";

// Coincide con el breakpoint `wide` (821px) de tailwind.config.ts.
export function useIsWide(): boolean {
  const [isWide, setIsWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 821px)");
    const update = () => setIsWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isWide;
}
