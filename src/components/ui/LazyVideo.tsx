"use client";

import Image from "next/image";
import { useRef } from "react";
import { useInView } from "motion/react";

/**
 * A background video that costs nothing until it's nearly on screen.
 *
 * Autoplay video downloads immediately regardless of `preload`, so a
 * below-the-fold cinematic can starve the entire first paint on
 * mobile. This mounts a lazy poster image only, and swaps in the real
 * <video> once the section is within ~1.5 viewports of the reader.
 */
export function LazyVideo({
  src,
  poster,
  className,
}: {
  src: string;
  poster: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const near = useInView(ref, { margin: "150% 0px", once: true });

  return (
    <div ref={ref} className={className} aria-hidden>
      {near ? (
        <video
          className="h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          poster={poster}
        >
          <source src={src} type="video/mp4" />
        </video>
      ) : (
        <Image
          src={poster}
          alt=""
          fill
          loading="lazy"
          sizes="100vw"
          className="object-cover"
        />
      )}
    </div>
  );
}
