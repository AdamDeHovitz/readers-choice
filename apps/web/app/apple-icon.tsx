import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon for iOS, which ignores SVG icons. Mirrors app/icon.svg. */
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
          background: "#994636",
        }}
      >
        <svg width="120" height="120" viewBox="128 136 256 248">
          <path
            d="M256 168c-34-24-80-34-128-32v216c48-2 94 8 128 32 34-24 80-34 128-32V136c-48-2-94 8-128 32z"
            fill="#fdfcf7"
          />
          <path
            d="M256 168v216"
            stroke="#994636"
            strokeWidth="14"
            strokeLinecap="round"
          />
        </svg>
      </div>
    ),
    size
  );
}
