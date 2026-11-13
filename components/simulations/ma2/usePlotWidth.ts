import { useEffect, useState, type RefObject } from "react";

export default function usePlotWidth(ref: RefObject<SVGSVGElement | null>, fallbackWidth: number) {
  const [width, setWidth] = useState(fallbackWidth);

  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;

    const update = () => {
      const nextWidth = Math.max(240, Math.round(svg.getBoundingClientRect().width));
      setWidth((current) => (current === nextWidth ? current : nextWidth));
    };

    update();
    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(update);
    observer.observe(svg);
    return () => observer.disconnect();
  }, [ref]);

  return width;
}