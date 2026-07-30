"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "motion/react";

/**
 * Animates a number toward its target. Used for the money readouts —
 * a rent figure that *steps* to a new value sells the event far better
 * than one that simply swaps.
 */
export function useCountUp(target: number, duration = 0.9) {
  const [value, setValue] = useState(target);
  const previous = useRef(target);

  useEffect(() => {
    const from = previous.current;
    previous.current = target;
    if (from === target) return;

    const controls = animate(from, target, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setValue(v),
    });
    return () => controls.stop();
  }, [target, duration]);

  return value;
}
