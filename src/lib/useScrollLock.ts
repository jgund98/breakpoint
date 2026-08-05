"use client";

import { useEffect } from "react";

/**
 * Locks background scroll without losing the reader's place.
 *
 * `body { overflow: hidden }` alone is the usual approach and it is
 * wrong on mobile: the document collapses to the top while the overlay
 * is open, and on close the reader is returned to a different scroll
 * position than the one they left. The symptom looks like content
 * jumping underneath a fixed header.
 *
 * This pins the body at a negative offset equal to the current scroll,
 * so the page stays visually still, then restores the exact position
 * on release.
 */
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    const y = window.scrollY;
    const body = document.body;
    const prev = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };

    body.style.position = "fixed";
    body.style.top = `-${y}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";

    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.left = prev.left;
      body.style.right = prev.right;
      body.style.width = prev.width;
      body.style.overflow = prev.overflow;
      // Restore instantly; a smooth scroll here would animate visibly.
      window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior });
    };
  }, [locked]);
}
