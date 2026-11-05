import type { MetadataRoute } from 'next';

// Lets the site be added to a phone's home screen and open without browser chrome.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Blessings',
    short_name: 'Blessings',
    description: 'A short, scripture-rooted blessing for today.',
    start_url: '/',
    display: 'standalone',
    background_color: '#fcf9f4',
    theme_color: '#fcf9f4',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  };
}
