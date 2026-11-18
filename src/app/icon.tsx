import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

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
          background: "linear-gradient(180deg, #061225 0%, #050b16 100%)",
          borderRadius: 64,
        }}
      >
        {/* Stylized cross/plus symbol - brand blue + grey */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: -24,
          }}
        >
          <div
            style={{
              width: 120,
              height: 120,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            {/* Horizontal bar - blue */}
            <div
              style={{
                position: "absolute",
                width: 80,
                height: 24,
                background: "#1e88e5",
                borderRadius: 12,
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              }}
            />
            {/* Vertical bar - grey */}
            <div
              style={{
                position: "absolute",
                width: 24,
                height: 80,
                background: "#475569",
                borderRadius: 12,
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              }}
            />
          </div>
          {/* "360" text */}
          <div
            style={{
              fontSize: 72,
              fontWeight: 950,
              color: "white",
              marginTop: 8,
              letterSpacing: -2,
            }}
          >
            360
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
