import { useEffect } from "react";
import gsap from "gsap";

export function useIconHover(ref) {
  useEffect(() => {
    if (!ref.current) return;

    const el = ref.current;

    const enter = () => {
      gsap.to(el, {
        scale: 1.12,
        y: -2,
        duration: 0.25,
        ease: "power2.out",
      });

      gsap.to(el.querySelector("img"), {
        rotate: 8,
        duration: 0.35,
        ease: "power2.out",
      });
    };

    const leave = () => {
      gsap.to(el, {
        scale: 1,
        y: 0,
        duration: 0.25,
        ease: "power2.out",
      });

      gsap.to(el.querySelector("img"), {
        rotate: 0,
        duration: 0.3,
        ease: "power2.out",
      });
    };

    el.addEventListener("mouseenter", enter);
    el.addEventListener("mouseleave", leave);

    return () => {
      el.removeEventListener("mouseenter", enter);
      el.removeEventListener("mouseleave", leave);
    };
  }, [ref]);
}
