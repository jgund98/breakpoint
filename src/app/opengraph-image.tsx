import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Breakpoint — co-tenancy intelligence for retail leases";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0a2f2a",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        {/* lockup */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <svg width="40" height="40" viewBox="0 0 32 32">
            <rect x="0" y="7" width="12.5" height="5" rx="0.5" fill="#f6f2e7" />
            <rect x="13.5" y="13.5" width="5" height="5" rx="0.5" fill="#d99a2b" />
            <rect x="19.5" y="20" width="12.5" height="5" rx="0.5" fill="#f6f2e7" />
          </svg>
          <span
            style={{
              color: "#f6f2e7",
              fontSize: 34,
              fontWeight: 600,
              letterSpacing: -1,
            }}
          >
            Breakpoint
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              color: "#e7b452",
              fontSize: 22,
              letterSpacing: 4,
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            Co-tenancy intelligence
          </span>
          <span
            style={{
              color: "#f6f2e7",
              fontSize: 76,
              lineHeight: 1.05,
              marginTop: 24,
              letterSpacing: -2.5,
              maxWidth: 900,
            }}
          >
            Somewhere in your portfolio, a clause just triggered.
          </span>
        </div>

        <span style={{ color: "#8ec2b7", fontSize: 26 }}>
          Every clause. Every center. Every night.
        </span>
      </div>
    ),
    size,
  );
}
