import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Serve AVIF first — the aerial hero drops roughly a third in weight
  // with no visible change.
  images: {
    formats: ["image/avif", "image/webp"],
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
