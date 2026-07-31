import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // WebP only. AVIF encodes cold on Vercel per size/device class and
  // can stall first mobile views for seconds — not worth the bytes.
  images: {
    formats: ["image/webp"],
  },
  experimental: {
    // Tree-shake the animation library down to what each chunk uses.
    optimizePackageImports: ["motion", "motion/react"],
  },
  async headers() {
    return [
      {
        // Immutable caching for the self-hosted media the pages lean on.
        source: "/:all*(mp4|jpg|jpeg|png|webp|avif)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
