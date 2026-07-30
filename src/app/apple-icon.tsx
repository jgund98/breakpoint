import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen / iMessage icon — the indicator on deep indigo. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(160deg, #2f2a9b 0%, #191553 100%)",
        }}
      >
        <svg width="120" height="120" viewBox="0 0 32 32">
          <rect x="12.25" y="11.5" width="7.5" height="18.5" rx="2.5" fill="#f6f4ee" />
          <rect x="12.25" y="2" width="7.5" height="7.5" rx="2.2" fill="#d99a2b" />
        </svg>
      </div>
    ),
    size,
  );
}
