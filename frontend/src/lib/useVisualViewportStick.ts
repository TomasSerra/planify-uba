import { useEffect, useRef } from "react";

// `position: fixed; bottom: 0` se ancla al layout viewport, así que cuando el
// navegador mobile muestra/esconde su barra inferior (o aparece el teclado) el
// elemento queda tapado o "salta" al scrollear. Lo pegamos al borde realmente
// visible con la Visual Viewport API.
export function useVisualViewportStick<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    const el = ref.current;
    if (!vv || !el) return;
    const update = () => {
      const overlap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      el.style.transform = overlap ? `translateY(${-overlap}px)` : "";
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);
  return ref;
}
