import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Breakpoint — Retail Lease Intelligence";

/** The link preview: deep indigo, the indicator mark, the one-liner. */
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
          background: "linear-gradient(135deg, #191553 0%, #100d2e 100%)",
          padding: 72,
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* brass glow + oversized motif */}
        <div
          style={{
            position: "absolute",
            right: -140,
            top: -160,
            width: 520,
            height: 520,
            borderRadius: 9999,
            background: "rgba(217,154,43,0.14)",
            filter: "blur(80px)",
          }}
        />
        <svg
          width="360"
          height="360"
          viewBox="0 0 32 32"
          style={{ position: "absolute", right: -30, bottom: -60, opacity: 0.1 }}
        >
          <rect x="12.25" y="11.5" width="7.5" height="18.5" rx="2.5" fill="#a5b0f7" />
          <rect x="12.25" y="2" width="7.5" height="7.5" rx="2.2" fill="#d99a2b" />
        </svg>

        {/* lockup */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 15,
              background: "#2f2a9b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="34" height="34" viewBox="0 0 32 32">
              <rect x="12.25" y="11.5" width="7.5" height="18.5" rx="2.5" fill="#f6f4ee" />
              <rect x="12.25" y="2" width="7.5" height="7.5" rx="2.2" fill="#d99a2b" />
            </svg>
          </div>
          <span
            style={{
              color: "#f6f4ee",
              fontSize: 40,
              fontWeight: 700,
              letterSpacing: -1.5,
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
              letterSpacing: 5,
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            Retail Lease Intelligence
          </span>
          <span
            style={{
              color: "#f6f4ee",
              fontSize: 74,
              lineHeight: 1.04,
              marginTop: 22,
              letterSpacing: -2.5,
              fontWeight: 700,
              maxWidth: 940,
            }}
          >
            Somewhere in your portfolio, a clause just triggered.
          </span>
        </div>

        <span style={{ color: "#c6c8e6", fontSize: 25 }}>
          Co-tenancy monitoring and rent recovery for retail tenants
        </span>
      </div>
    ),
    size,
  );
}
