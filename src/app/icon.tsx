import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** The mark: a rent line stepping down past a unit gone dark. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#191553",
        }}
      >
        <svg width="46" height="46" viewBox="0 0 32 32">
          <rect x="0" y="7" width="12.5" height="5" rx="0.5" fill="#f6f2e7" />
          <rect x="13.5" y="13.5" width="5" height="5" rx="0.5" fill="#d99a2b" />
          <rect x="19.5" y="20" width="12.5" height="5" rx="0.5" fill="#f6f2e7" />
        </svg>
      </div>
    ),
    size,
  );
}
