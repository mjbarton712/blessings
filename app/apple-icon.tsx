import { ImageResponse } from 'next/og';

// Home-screen icon for iOS, which needs a PNG rather than the SVG favicon.
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fcf3e6',
        }}
      >
        <svg width="150" height="150" viewBox="0 0 64 64">
          <circle cx="32" cy="38" r="10" fill="#d9a35f" />
          <g stroke="#d9a35f" strokeWidth="3.5" strokeLinecap="round">
            <path d="M32 16v6" />
            <path d="M16.5 22.5l4.2 4.2" />
            <path d="M47.5 22.5l-4.2 4.2" />
            <path d="M12 38h6" />
            <path d="M46 38h6" />
          </g>
          <path d="M12 48h40" stroke="#8c6230" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      </div>
    ),
    size,
  );
}
